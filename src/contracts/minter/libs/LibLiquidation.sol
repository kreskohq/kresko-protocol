// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {MinterState} from "minter/libs/LibMinterBig.sol";
import {CollateralAsset, KrAsset} from "common/libs/Assets.sol";
import {scdp, PoolKrAsset} from "scdp/libs/LibSCDP.sol";
import {sdi} from "scdp/libs/LibSDI.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {Shared} from "common/libs/Shared.sol";

library LibLiquidation {
    using WadRay for uint256;
    /* -------------------------------------------------------------------------- */
    /*                                Liquidations                                */
    /* -------------------------------------------------------------------------- */

    struct MaxLiquidationVars {
        CollateralAsset collateral;
        uint256 accountCollateralValue;
        uint256 minCollateralValue;
        uint256 seizeCollateralAccountValue;
        uint256 maxLiquidationMultiplier;
        uint256 minimumDebtValue;
        uint256 liquidationThreshold;
        uint256 debtFactor;
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
    ) internal view returns (uint256 maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationParams(self, _account, _repayKreskoAsset, _seizedCollateral);
        // Account is not liquidatable
        if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
            return 0;
        }

        maxLiquidatableUSD = _getMaxLiquidatableUSD(vars, _repayKreskoAsset);

        if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD < vars.minimumDebtValue) {
            return vars.minimumDebtValue;
        } else {
            return maxLiquidatableUSD;
        }
    }

    /**
     * @notice Calculate amount of collateral to seize during the liquidation procesself.
     * @param _liquidationIncentiveMultiplier The liquidation incentive multiplier.
     * @param _collateralOraclePriceUSD The address of the collateral asset to be seized.
     * @param _kreskoAssetRepayAmountUSD Kresko asset amount being repaid in exchange for the seized collateral.
     */
    function calculateAmountToSeize(
        uint256 _liquidationIncentiveMultiplier,
        uint256 _collateralOraclePriceUSD,
        uint256 _kreskoAssetRepayAmountUSD
    ) internal pure returns (uint256) {
        // Seize amount = (repay amount USD * liquidation incentive / collateral price USD).
        // Denominate seize amount in collateral type
        // Apply liquidation incentive multiplier
        return _kreskoAssetRepayAmountUSD.wadMul(_liquidationIncentiveMultiplier).wadDiv(_collateralOraclePriceUSD);
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
    ) private pure returns (uint256) {
        uint256 valuePerUSDRepaid = (vars.debtFactor -
            vars.collateral.liquidationIncentive -
            _repayKreskoAsset.closeFee).wadDiv(vars.debtFactor);
        return
            (vars.minCollateralValue - vars.accountCollateralValue)
                .wadMul(vars.maxLiquidationMultiplier)
                .wadDiv(valuePerUSDRepaid)
                .wadDiv(vars.debtFactor)
                .wadDiv(vars.collateral.factor);
    }

    function _getMaxLiquidationParams(
        MinterState storage state,
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) private view returns (MaxLiquidationVars memory) {
        uint256 liquidationThreshold = state.liquidationThreshold;
        uint256 minCollateralValue = state.getAccountMinimumCollateralValueAtRatio(_account, liquidationThreshold);

        (uint256 accountCollateralValue, uint256 seizeCollateralAccountValue) = state.accountCollateralValue(
            _account,
            _seizedCollateral
        );

        CollateralAsset memory collateral = state.collateralAssets[_seizedCollateral];

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: accountCollateralValue,
                debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
                minCollateralValue: minCollateralValue,
                minimumDebtValue: state.minimumDebtValue,
                seizeCollateralAccountValue: seizeCollateralAccountValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: state.maxLiquidationMultiplier
            });
    }

    /* -------------------------------------------------------------------------- */
    /*                              Liquidation Views                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Checks if accounts collateral value is less than required.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(MinterState storage self, address _account) internal view returns (bool) {
        return
            self.accountCollateralValue(_account) <
            (self.getAccountMinimumCollateralValueAtRatio(_account, self.liquidationThreshold));
    }

    /**
     * @notice Overload for calculating liquidatable status with a future liquidated collateral value
     * @param _account The account to check.
     * @param _valueLiquidated Value liquidated, eg. in a batch liquidation
     * @return bool indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(
        MinterState storage self,
        address _account,
        uint256 _valueLiquidated
    ) internal view returns (bool) {
        return
            self.accountCollateralValue(_account) - _valueLiquidated <
            (self.getAccountMinimumCollateralValueAtRatio(_account, self.liquidationThreshold));
    }

    /* -------------------------------------------------------------------------- */
    /*                                    SCDP                                    */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Checks whether the shared debt pool can be liquidated.
     */
    function isSCDPLiquidatable() internal view returns (bool) {
        return !Shared.checkSCDPRatio(scdp().liquidationThreshold);
    }

    function getMaxLiquidationShared(
        MinterState storage _minterState,
        PoolKrAsset memory _repayAssetConfig,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (uint256 maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationParamsShared(
            _minterState,
            _repayKreskoAsset,
            _seizedCollateral
        );
        // Account is not liquidatable
        if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
            return 0;
        }

        maxLiquidatableUSD = _getMaxLiquidatableUSDShared(vars, _repayAssetConfig);

        if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD < vars.minimumDebtValue) {
            return vars.minimumDebtValue;
        } else {
            return maxLiquidatableUSD;
        }
    }

    function _getMaxLiquidatableUSDShared(
        MaxLiquidationVars memory vars,
        PoolKrAsset memory _repayKreskoAsset
    ) private pure returns (uint256) {
        uint256 valuePerUSDRepaid = (vars.debtFactor - _repayKreskoAsset.liquidationIncentive).wadDiv(vars.debtFactor);
        return
            (vars.minCollateralValue - vars.accountCollateralValue)
                .wadMul(vars.maxLiquidationMultiplier)
                .wadDiv(valuePerUSDRepaid)
                .wadDiv(vars.debtFactor)
                .wadDiv(vars.collateral.factor);
    }

    function _getMaxLiquidationParamsShared(
        MinterState storage _minterState,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) private view returns (MaxLiquidationVars memory) {
        uint256 liquidationThreshold = scdp().liquidationThreshold;
        uint256 minCollateralValue = sdi().effectiveDebtUSD().wadMul(liquidationThreshold);

        (uint256 totalCollateralValue, uint256 seizeCollateralValue) = Shared.getTotalPoolDepositValue(
            _seizedCollateral,
            scdp().totalDeposits[_seizedCollateral],
            false
        );

        CollateralAsset memory collateral = _minterState.collateralAssets[_seizedCollateral];

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: totalCollateralValue,
                debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
                minCollateralValue: minCollateralValue,
                minimumDebtValue: _minterState.minimumDebtValue,
                seizeCollateralAccountValue: seizeCollateralValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: _minterState.maxLiquidationMultiplier
            });
    }
}
