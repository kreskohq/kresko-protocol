// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.19;

import {CollateralAsset, KrAsset} from "common/libs/Assets.sol";
import {scdp, PoolKrAsset} from "scdp/libs/LibSCDP.sol";
import {sdi} from "scdp/libs/LibSDI.sol";
import {ms} from "minter/libs/LibMinter.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {Shared} from "common/libs/Shared.sol";

library Liquidations {
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
        uint256 minDebtValue;
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
    function maxLiquidatableValue(
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (uint256 maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationVars(_account, _repayKreskoAsset, _seizedCollateral);
        // Account is not liquidatable
        if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
            return 0;
        }

        maxLiquidatableUSD = _calcMaxLiquidatableValue(vars, _repayKreskoAsset);

        if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD < vars.minDebtValue) {
            return vars.minDebtValue;
        } else {
            return maxLiquidatableUSD;
        }
    }

    /**
     * @notice Calculate amount of collateral to seize during the liquidation procesself.
     * @param _liquidationIncentiveMultiplier The liquidation incentive multiplier.
     * @param _collateralOraclePriceUSD The collateral oracle price in USD.
     * @param _kreskoAssetRepayAmountUSD KreskoAsset amount being repaid in exchange for the seized collateral.
     */
    function calcSeizeAmount(
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
     * Calculates the value gained per USD repaid in liquidation for a given kreskoAsset
     * debtFactor = debtFactor = k * LT / cFactor;
     * valPerUSD = (DebtFactor - Asset closeFee - liquidationIncentive) / DebtFactor
     *
     * Calculates the maximum amount of USD value that can be liquidated given the account's collateral value
     * maxLiquidatableUSD = (MCV - ACV) / valPerUSD / debtFactor / cFactor * LOM
     * @dev This function is used by getMaxLiquidation and is factored out for readability
     * @param vars liquidation variables struct
     * @param _repayKreskoAsset The kreskoAsset being repaid in the liquidation
     */
    function _calcMaxLiquidatableValue(
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

    function _getMaxLiquidationVars(
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) private view returns (MaxLiquidationVars memory) {
        uint256 liquidationThreshold = ms().liquidationThreshold;

        uint256 minCollateralValue = ms().accountMinCollateralAtRatio(_account, liquidationThreshold);

        (uint256 accountCollateralValue, uint256 seizeCollateralAccountValue) = ms().accountCollateralAssetValue(
            _account,
            _seizedCollateral
        );

        CollateralAsset memory collateral = ms().collateralAssets[_seizedCollateral];

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: accountCollateralValue,
                debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
                minCollateralValue: minCollateralValue,
                minDebtValue: ms().minDebtValue,
                seizeCollateralAccountValue: seizeCollateralAccountValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: ms().maxLiquidationMultiplier
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
    function isAccountLiquidatable(address _account) internal view returns (bool) {
        return
            ms().accountCollateralValue(_account) <
            ms().accountMinCollateralAtRatio(_account, ms().liquidationThreshold);
    }

    /**
     * @notice Overload for calculating liquidatable status with a future liquidated collateral value
     * @param _account The account to check.
     * @param _valueLiquidated Value liquidated, eg. in a batch liquidation
     * @return bool indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(address _account, uint256 _valueLiquidated) internal view returns (bool) {
        return
            ms().accountCollateralValue(_account) - _valueLiquidated <
            (ms().accountMinCollateralAtRatio(_account, ms().liquidationThreshold));
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

    function maxLiquidatableValueSCDP(
        PoolKrAsset memory _repayAssetConfig,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (uint256 maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationVarsSCDP(_repayKreskoAsset, _seizedCollateral);
        // Account is not liquidatable
        if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
            return 0;
        }

        maxLiquidatableUSD = _calcMaxLiquidatableValueSCDP(vars, _repayAssetConfig);

        if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD < vars.minDebtValue) {
            return vars.minDebtValue;
        } else {
            return maxLiquidatableUSD;
        }
    }

    function _calcMaxLiquidatableValueSCDP(
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

    function _getMaxLiquidationVarsSCDP(
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

        CollateralAsset memory collateral = ms().collateralAssets[_seizedCollateral];

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: totalCollateralValue,
                debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
                minCollateralValue: minCollateralValue,
                minDebtValue: ms().minDebtValue,
                seizeCollateralAccountValue: seizeCollateralValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: ms().maxLiquidationMultiplier
            });
    }
}
