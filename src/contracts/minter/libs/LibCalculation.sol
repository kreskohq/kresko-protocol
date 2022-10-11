// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Math} from "../../libs/Math.sol";

import {MinterState} from "../MinterState.sol";
import {KrAsset} from "../MinterTypes.sol";
import "hardhat/console.sol";

uint256 constant ONE_HUNDRED_PERCENT = 1e18;
uint256 constant ONE_USD = 1e18;

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
        // Underwater value for this asset pair
        FixedPoint.Unsigned memory collateralSide = self.getValueUnderForAssetPair(
            _account,
            _repayKreskoAsset,
            _collateralAssetToSeize
        );

        if (collateralSide.rawValue == 0) {
            return FixedPoint.Unsigned(0);
        } else {
            FixedPoint.Unsigned memory cFactor = self.collateralAssets[_collateralAssetToSeize].factor;
            KrAsset memory krAsset = self.kreskoAssets[_repayKreskoAsset];

            // Max repayment value for this pair
            FixedPoint.Unsigned memory krAssetSide = collateralSide
                .mul(self.liquidationThreshold)
                .mul(self.liquidationIncentiveMultiplier)
                .mul(krAsset.kFactor)
                .div(cFactor);

            // Diminish liquidatable value for assets with lower cFactor
            // This is desired as they have more seizable value.
            if (
                self.depositedCollateralAssets[_account].length > 1 &&
                cFactor.isLessThan(FixedPoint.Unsigned(ONE_HUNDRED_PERCENT))
            ) {
                // cFactor^4 is the diminishing factor (cFactor = 1 == nothing happens)
                return krAssetSide.mul(cFactor.pow(4)).add(collateralSide);
            } else {
                // For single CDP accounts and seized collaterals with a cFactor of 1
                return krAssetSide.add(collateralSide);
            }
        }
    }

    function getValueUnderForAssetPair(
        MinterState storage self,
        address _account,
        address _krAsset,
        address _collateralAsset
    ) internal view returns (FixedPoint.Unsigned memory) {
        // Minimum collateral value required for the krAsset position
        FixedPoint.Unsigned memory minCollateralValue = self.getMinimumCollateralValueAtRatio(
            _krAsset,
            self.getKreskoAssetDebt(_account, _krAsset),
            self.liquidationThreshold
        );
        // Collateral value for this position
        FixedPoint.Unsigned memory collateralValueAccount = self.getAccountCollateralValue(_account);

        (FixedPoint.Unsigned memory collateralAssetValueAvailable, ) = self.getCollateralValueAndOraclePrice(
            _collateralAsset,
            self.getCollateralDeposits(_account, _collateralAsset),
            false // take cFactor into consideration
        );
        if (minCollateralValue.isLessThan(collateralValueAccount)) {
            return FixedPoint.Unsigned(0);
        }

        FixedPoint.Unsigned memory valueUnder = minCollateralValue.sub(collateralValueAccount);

        if (valueUnder.isGreaterThanOrEqual(collateralAssetValueAvailable)) {
            return collateralAssetValueAvailable;
        } else if (valueUnder.isLessThan(self.minimumDebtValue)) {
            return self.minimumDebtValue;
        } else {
            return valueUnder;
        }
    }

    /**
     * @notice Calculates the close fee for a burned asset.
     * @param _collateralAssetAddress The collateral asset from which to take to the fee.
     * @param _account The owner of the collateral.
     * @param _feeValue The original value of the fee.
     * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
     * @return The transfer amount to be received as a uint256 and a FixedPoint.Unsigned
     * representing the fee value paid.
     */
    function calcCloseFee(
        MinterState storage self,
        address _collateralAssetAddress,
        address _account,
        FixedPoint.Unsigned memory _feeValue,
        uint256 _collateralAssetIndex
    ) internal returns (uint256, FixedPoint.Unsigned memory) {
        uint256 depositAmount = self.getCollateralDeposits(_account, _collateralAssetAddress);

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
