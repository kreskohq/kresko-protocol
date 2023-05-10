// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {LibDecimals} from "../libs/LibDecimals.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {MinterState} from "../MinterState.sol";
import {KrAsset, CollateralAsset} from "../MinterTypes.sol";
import "hardhat/console.sol";

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
     * @param _seizedCollateral The collateral asset being seized in the liquidation
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function calculateMaxLiquidatableValueForAssets(
        MinterState storage self,
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        FixedPoint.Unsigned memory minCollateralRequired = self.getAccountMinimumCollateralValueAtRatio(
            _account,
            self.liquidationThreshold
        );

        (
            FixedPoint.Unsigned memory accountCollateralValue,
            FixedPoint.Unsigned memory seizeCollateralAccountValue
        ) = self.getAccountCollateralValue(_account, _seizedCollateral);

        // Account is not liquidatable
        if (accountCollateralValue.isGreaterThanOrEqual(minCollateralRequired)) {
            return FixedPoint.Unsigned(0);
        }
        CollateralAsset memory casset = self.collateralAssets[_seizedCollateral]; // 6.72
        FixedPoint.Unsigned memory debtFactor = _repayKreskoAsset.kFactor.mul(self.liquidationThreshold).div(
            casset.factor
        );
        console.log("debtFactor", debtFactor.rawValue);
        // Max repayment value for this pair
        // maxLiquidatableUSD = valueUnder.wadDiv(debtFactor).wadMul(
        //     collateralAsset.liquidationIncentive.rawValue.add(kreskoAsset.closeFee.rawValue)
        // );
        maxLiquidatableUSD = minCollateralRequired.sub(accountCollateralValue).div(FixedPoint.Unsigned(1.1175 ether));
        // .mul(getCollateralFactor(_repayKreskoAsset, casset))
        // .div(debtFactor)
        // .mul(FixedPoint.Unsigned(4.67 ether));
        // .div(debtFactor);
        // maxLiquidatableUSD = minCollateralRequired.sub(accountCollateralValue).div(
        //     calcValueGainedPerUSDRepaid(debtFactor, _repayKreskoAsset, self.collateralAssets[_seizedCollateral])
        // );
        // .div(debtFactor);

        if (seizeCollateralAccountValue.isLessThan(maxLiquidatableUSD)) {
            return seizeCollateralAccountValue;
        }
        // else if (maxLiquidatableUSD.isLessThan(self.minimumDebtValue)) {
        //     return self.minimumDebtValue;
        // }

        return maxLiquidatableUSD;
    }

    function getCollateralFactor(
        KrAsset memory _repayKreskoAsset,
        CollateralAsset memory _collateralAssetToSeize
    ) internal pure returns (FixedPoint.Unsigned memory) {
        return
            FixedPoint.Unsigned(1 ether + _repayKreskoAsset.closeFee.rawValue).mul(
                _collateralAssetToSeize.liquidationIncentive
            );
    }

    /**
     * @notice Calculates the value gained per USD repaid in liquidation for a given kreskoAsset
     * @dev (DebtFactor - Asset closeFee - liquidationIncentive) / DebtFactor
     * @param _debtFactor Ratio of adjusted debt value to real value of the kreskoAsset being repaid
     * @param _repayKreskoAsset The kreskoAsset being repaid in the liquidation
     * @param _collateralAssetToSeize The collateral asset being seized in the liquidation
     */
    function calcValueGainedPerUSDRepaid(
        FixedPoint.Unsigned memory _debtFactor,
        KrAsset memory _repayKreskoAsset,
        CollateralAsset memory _collateralAssetToSeize
    ) internal pure returns (FixedPoint.Unsigned memory) {
        return
            FixedPoint
                .Unsigned(
                    _debtFactor.rawValue -
                        _collateralAssetToSeize.liquidationIncentive.rawValue -
                        _repayKreskoAsset.closeFee.rawValue
                )
                .div(_debtFactor);
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
