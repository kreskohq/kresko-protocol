// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {LibDecimals} from "../libs/LibDecimals.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {MinterState} from "../MinterState.sol";
import {KrAsset, CollateralAsset} from "../MinterTypes.sol";

/**
 * @title Calculation library for liquidation & fee values
 * @author Kresko
 */
library LibCalculation {
    struct MaxLiquidationVars {
        CollateralAsset collateral;
        FixedPoint.Unsigned accountCollateralValue;
        FixedPoint.Unsigned debtFactor;
        FixedPoint.Unsigned minCollateralValue;
        FixedPoint.Unsigned minimumDebtValue;
        FixedPoint.Unsigned liquidationThreshold;
        FixedPoint.Unsigned maxLiquidationMultiplier;
        FixedPoint.Unsigned seizeCollateralAccountValue;
    }

    using Arrays for address[];
    using LibDecimals for uint8;
    using LibDecimals for uint256;

    using FixedPoint for FixedPoint.Unsigned;

    function _getMaxLiquidationParams(
        MinterState storage state,
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) private view returns (MaxLiquidationVars memory) {
        FixedPoint.Unsigned memory liquidationThreshold = state.liquidationThreshold;
        FixedPoint.Unsigned memory minCollateralValue = state.getAccountMinimumCollateralValueAtRatio(
            _account,
            liquidationThreshold
        );

        (
            FixedPoint.Unsigned memory accountCollateralValue,
            FixedPoint.Unsigned memory seizeCollateralAccountValue
        ) = state.getAccountCollateralValue(_account, _seizedCollateral);

        CollateralAsset memory collateral = state.collateralAssets[_seizedCollateral];

        // debtFactor = k * LT / cFactor
        FixedPoint.Unsigned memory debtFactor = _repayKreskoAsset.kFactor.mul(liquidationThreshold).div(
            collateral.factor
        );

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: accountCollateralValue,
                debtFactor: debtFactor,
                minCollateralValue: minCollateralValue,
                minimumDebtValue: state.minimumDebtValue,
                seizeCollateralAccountValue: seizeCollateralAccountValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: state.maxLiquidationMultiplier
            });
    }

    /**
     * @dev Calculates the total value that can be liquidated for a liquidation pair
     * @param _account address to liquidate
     * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
     * @param _seizedCollateral The collateral asset being seized in the liquidation
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function getMaxLiquidation(
        MinterState storage self,
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationParams(self, _account, _repayKreskoAsset, _seizedCollateral);
        // Account is not liquidatable
        if (vars.accountCollateralValue.isGreaterThanOrEqual(vars.minCollateralValue)) {
            return FixedPoint.Unsigned(0);
        }

        maxLiquidatableUSD = _getMaxLiquidatableUSD(vars, _repayKreskoAsset);
        // FixedPoint.Unsigned memory valuePerUSDRepaid = FixedPoint
        //     .Unsigned(
        //         vars.debtFactor.rawValue -
        //             vars.collateral.liquidationIncentive.rawValue -
        //             _repayKreskoAsset.closeFee.rawValue
        //     )
        //     .div(vars.debtFactor);

        // maxLiquidatableUSD = vars
        //     .minCollateralValue
        //     .sub(vars.accountCollateralValue)
        //     .div(valuePerUSDRepaid)
        //     .div(vars.debtFactor)
        //     .div(vars.collateral.factor)
        //     .mul(FixedPoint.Unsigned(1 ether + 1e14));

        if (vars.seizeCollateralAccountValue.isLessThan(maxLiquidatableUSD)) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD.isLessThan(vars.minimumDebtValue)) {
            return vars.minimumDebtValue;
        }

        return maxLiquidatableUSD;
    }

    /**
     * @notice Calculates the maximum USD value of a given kreskoAsset that can be liquidated given a liquidation pair
     *
     * 1. Calculates the value gained per USD repaid in liquidation for a given kreskoAsset
     *
     * debtFactor = debtFactor = k * LT / cFactor;
     *
     * valPerUSD = (DebtFactor - Asset closeFee - liquidationIncentive) / DebtFactor
     *
     * 2. Calculates the maximum amount of USD value that can be liquidated given the account's collateral value
     *
     * maxLiquidatableUSD = (MCV - ACV) / valPerUSD / debtFactor / cFactor * LOM
     *
     * @dev This function is used by getMaxLiquidation and is factored out for readability
     * @param vars liquidation variables struct
     * @param _repayKreskoAsset The kreskoAsset being repaid in the liquidation
     */
    function _getMaxLiquidatableUSD(
        MaxLiquidationVars memory vars,
        KrAsset memory _repayKreskoAsset
    ) private pure returns (FixedPoint.Unsigned memory) {
        // the value gained per USD repaid in liquidation for a given kreskoAsset
        //
        FixedPoint.Unsigned memory valuePerUSDRepaid = FixedPoint
            .Unsigned(
                vars.debtFactor.rawValue -
                    vars.collateral.liquidationIncentive.rawValue -
                    _repayKreskoAsset.closeFee.rawValue
            )
            .div(vars.debtFactor);

        return
            vars
                .minCollateralValue
                .sub(vars.accountCollateralValue)
                .div(valuePerUSDRepaid)
                .div(vars.debtFactor)
                .div(vars.collateral.factor)
                .mul(vars.maxLiquidationMultiplier);
    }

    /**
     * @notice Calculate amount of collateral to seize during the liquidation procesself.
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
     * @notice Calculates the fee to be taken from a user's deposited collateral assetself.
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
