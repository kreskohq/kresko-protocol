// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {LibDecimals} from "../libs/LibDecimals.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {MinterState} from "../MinterState.sol";
import {KrAsset} from "../MinterTypes.sol";

/**
 * @title Calculation library for liquidation & fee values
 * @author Kresko
 */
library LibCalculation {
    using Arrays for address[];
    using LibDecimals for uint8;
    using LibDecimals for uint256;

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
        FixedPoint.Unsigned memory minCollateralRequired = self.getAccountMinimumCollateralValueAtRatio(
            _account,
            self.liquidationThreshold
        );
        FixedPoint.Unsigned memory accountCollateralValue = self.getAccountCollateralValue(_account);

        // Account is not liquidatable
        if (accountCollateralValue.isGreaterThanOrEqual(minCollateralRequired)) {
            return FixedPoint.Unsigned(0);
        }

        FixedPoint.Unsigned memory valueGainedPerUSDRepaid = self.calcValueGainedPerUSDRepaid(
            _repayKreskoAsset,
            _collateralAssetToSeize
        );

        // Max repayment value for this pair
        maxLiquidatableUSD = minCollateralRequired.sub(accountCollateralValue).div(valueGainedPerUSDRepaid);

        // Diminish liquidatable value for assets with lower cFactor
        // This is desired as they have more seizable value.
        FixedPoint.Unsigned memory cFactor = self.collateralAssets[_collateralAssetToSeize].factor;

        if (
            self.depositedCollateralAssets[_account].length > 1 && cFactor.isLessThan(FixedPoint.ONE_HUNDRED_PERCENT())
        ) {
            // cFactor^4 is the diminishing factor (cFactor = 1 == nothing happens)
            return maxLiquidatableUSD.mul(cFactor.pow(4));
        }
    }

    function calcValueGainedPerUSDRepaid(
        MinterState storage self,
        address _repayKreskoAsset,
        address _collateralToSeize
    ) internal view returns (FixedPoint.Unsigned memory) {
        KrAsset memory krAsset = self.kreskoAssets[_repayKreskoAsset];
        FixedPoint.Unsigned memory cFactor = self.collateralAssets[_collateralToSeize].factor;
        return
            krAsset
                .kFactor
                .mul(self.liquidationThreshold)
                .mul(FixedPoint.ONE_HUNDRED_PERCENT().sub(krAsset.closeFee))
                .mul(cFactor)
                .div(self.liquidationIncentiveMultiplier)
                .sub(FixedPoint.ONE_USD());
    }

    /**
     * @notice Calculate amount of collateral to seize during the liquidation process.
     * @param _liquidationIncentiveMultiplier The liquidation incentive multiplier.
     * @param _collateralOraclePriceUSD The address of the collateral asset to be seized.
     * @param _kreskoAssetRepayAmountUSD Kresko asset amount being repaid in exchange for the seized collateral.
     */
    function calculateAmountToSeize(
        FixedPoint.Unsigned memory _liquidationIncentiveMultiplier,
        FixedPoint.Unsigned memory _collateralOraclePriceUSD,
        FixedPoint.Unsigned memory _kreskoAssetRepayAmountUSD
    ) internal pure returns (FixedPoint.Unsigned memory) {
        // Seize amount = (repay amount USD * liquidation incentive / collateral price USD).
        // Denominate seize amount in collateral type
        // Apply liquidation incentive multiplier
        return _kreskoAssetRepayAmountUSD.mul(_liquidationIncentiveMultiplier).div(_collateralOraclePriceUSD);
    }

    /**
     * @notice Calculates the fee to be taken from a user's deposited collateral assets.
     * @param _collateralAsset The collateral asset from which to take to the fee.
     * @param _account The owner of the collateral.
     * @param _feeValue The original value of the fee.
     * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
     *
     * @return transferAmount to be received as a uint256
     * @return feeValuePaid FixedPoint.Unsigned representing the fee value paid.
     */
    function calcFee(
        MinterState storage self,
        address _collateralAsset,
        address _account,
        FixedPoint.Unsigned memory _feeValue,
        uint256 _collateralAssetIndex
    ) internal returns (uint256 transferAmount, FixedPoint.Unsigned memory feeValuePaid) {
        uint256 depositAmount = self.getCollateralDeposits(_account, _collateralAsset);

        // Don't take the collateral asset's collateral factor into consideration.
        (FixedPoint.Unsigned memory depositValue, FixedPoint.Unsigned memory oraclePrice) = self
            .getCollateralValueAndOraclePrice(_collateralAsset, depositAmount, true);

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
            transferAmount = self.collateralAssets[_collateralAsset].decimals.fromCollateralFixedPointAmount(
                _feeValue.div(oraclePrice)
            );
            feeValuePaid = _feeValue;
        } else {
            // If the feeValue >= depositValue, the entire deposit
            // should be taken as the fee.
            transferAmount = depositAmount;
            feeValuePaid = depositValue;
            // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralAssetIndex);
        }

        return (transferAmount, feeValuePaid);
    }
}
