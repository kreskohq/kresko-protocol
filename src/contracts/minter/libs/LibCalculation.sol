// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Math} from "../../libs/Math.sol";

import {MinterState} from "../MinterState.sol";

uint256 constant ONE_HUNDRED_PERCENT = 1e18;

library LibCalc {
    using Arrays for address[];
    using Math for uint8;
    using Math for uint256;
    using FixedPoint for FixedPoint.Unsigned;

    /**
     * @dev Calculates the total value that can be liquidated for a liquidation pair
     * @param _account address to liquidate
     * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
     * @param _collateralAssetToSeize address of the collateral asset being seized from the liquidatee
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function calculateMaxLiquidatableValueForAssets(
        MinterState storage self,
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) internal view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        // Minimum collateral value required for the krAsset position
        FixedPoint.Unsigned memory minCollateralValue = self.getMinimumCollateralValue(
            _repayKreskoAsset,
            self.kreskoAssetDebt[_account][_repayKreskoAsset]
        );

        // Collateral value for this position
        (FixedPoint.Unsigned memory collateralValueAvailable, ) = self.getCollateralValueAndOraclePrice(
            _collateralAssetToSeize,
            self.collateralDeposits[_account][_collateralAssetToSeize],
            false // take cFactor into consideration
        );
        if (collateralValueAvailable.isGreaterThanOrEqual(minCollateralValue)) {
            return FixedPoint.Unsigned(0);
        } else {
            // Get the factors of the assets
            FixedPoint.Unsigned memory kFactor = self.kreskoAssets[_repayKreskoAsset].kFactor;
            FixedPoint.Unsigned memory cFactor = self.collateralAssets[_collateralAssetToSeize].factor;

            // Calculate how much value is under
            FixedPoint.Unsigned memory valueUnderMin = minCollateralValue.sub(collateralValueAvailable);

            // Get the divisor which calculates the max repayment from the underwater value
            FixedPoint.Unsigned memory repayDivisor = kFactor.mul(self.minimumCollateralizationRatio).sub(
                self.liquidationIncentiveMultiplier.sub(self.burnFee).mul(cFactor)
            );

            // Max repayment value for this pair
            maxLiquidatableUSD = valueUnderMin.div(repayDivisor);

            // Get the future collateral value that is being used for the liquidation
            FixedPoint.Unsigned memory collateralValueRepaid = maxLiquidatableUSD.div(
                kFactor.mul(self.liquidationIncentiveMultiplier.add(self.burnFee))
            );

            // If it's more than whats available get the max value from how much value is available instead.
            if (collateralValueRepaid.isGreaterThan(collateralValueAvailable)) {
                // Reverse the divisor formula to achieve the max repayment from available collateral.
                // We end up here if the user has multiple positions with different risk profiles.
                maxLiquidatableUSD = collateralValueAvailable.div(collateralValueRepaid.div(valueUnderMin));
            }

            // Cascade the liquidations if user has multiple collaterals and cFactor < 1.
            // This is desired because pairs with low cFactor have higher collateral requirement
            // than positions with high cFactor.

            // Main reason here is keep the liquidations from happening only on pairs that have a high risk profile.
            if (self.depositedCollateralAssets[_account].length > 1 && cFactor.isLessThan(ONE_HUNDRED_PERCENT)) {
                // To mitigate:
                // cFactor^4 the collateral available (cFactor = 1 == nothing happens)
                // Get the ratio between max liquidatable USD and diminished collateral available
                // = (higher value -> higher the risk ratio of this pair)
                // Divide the maxValue by this ratio and a diminishing max value is returned.

                // For a max profit liquidation strategy jumps to other pairs must happen before
                // the liquidation value of the risky position becomes the most profitable again.

                return
                    maxLiquidatableUSD.div(maxLiquidatableUSD.div(collateralValueAvailable.mul(cFactor.pow(4)))).mul(
                        // Include a burnFee surplus in the liquidation
                        // so the users can repay their debt.
                        FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(self.burnFee)
                    );
            } else {
                // For collaterals with cFactor = 1 / accounts with only single collateral
                // the debt is just repaid in full with a single transaction
                return maxLiquidatableUSD.mul(FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(self.burnFee));
            }
        }
    }

    /**
     * @notice Calculates the burn fee for a burned asset.
     * @param _collateralAssetAddress The collateral asset from which to take to the fee.
     * @param _account The owner of the collateral.
     * @param _feeValue The original value of the fee.
     * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
     * @return The transfer amount to be received as a uint256 and a FixedPoint.Unsigned
     * representing the fee value paid.
     */
    function calcBurnFee(
        MinterState storage self,
        address _collateralAssetAddress,
        address _account,
        FixedPoint.Unsigned memory _feeValue,
        uint256 _collateralAssetIndex
    ) internal returns (uint256, FixedPoint.Unsigned memory) {
        uint256 depositAmount = self.collateralDeposits[_account][_collateralAssetAddress];

        // Don't take the collateral asset's collateral factor into consideration.
        (FixedPoint.Unsigned memory depositValue, FixedPoint.Unsigned memory oraclePrice) = self
            .getCollateralValueAndOraclePrice(_collateralAssetAddress, depositAmount, true);

        FixedPoint.Unsigned memory feeValuePaid;
        uint256 transferAmount;
        // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
        if (_feeValue.isLessThan(depositValue)) {
            // We want to make sure that transferAmount is < depositAmount.
            // Proof:
            //   depositValue <= oraclePrice * depositAmount (<= due to a potential loss of precision)
            //   feeValue < depositValue
            // Meaning:
            //   feeValue < oraclePrice * depositAmount
            // Solving for depositAmount we get:
            //   feeValue / oraclePrice < depositAmount
            // Due to integer division:
            //   transferAmount = floor(feeValue / oracleValue)
            //   transferAmount <= feeValue / oraclePrice
            // We see that:
            //   transferAmount <= feeValue / oraclePrice < depositAmount
            //   transferAmount < depositAmount
            transferAmount = self.collateralAssets[_collateralAssetAddress].decimals._fromCollateralFixedPointAmount(
                _feeValue.div(oraclePrice)
            );
            feeValuePaid = _feeValue;
        } else {
            // If the feeValue >= depositValue, the entire deposit
            // should be taken as the fee.
            transferAmount = depositAmount;
            feeValuePaid = depositValue;
            // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
            self.depositedCollateralAssets[_account].removeAddress(_collateralAssetAddress, _collateralAssetIndex);
        }
        return (transferAmount, feeValuePaid);
    }
}
