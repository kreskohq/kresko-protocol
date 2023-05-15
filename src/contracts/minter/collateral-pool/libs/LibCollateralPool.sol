// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {IKreskoAsset} from "../../../kreskoasset/IKreskoAsset.sol";
import {IERC20Upgradeable} from "../../../shared/IERC20Upgradeable.sol";

import {FixedPoint} from "../../../libs/FixedPoint.sol";
import {WadRay} from "../../../libs/WadRay.sol";
import {Error} from "../../../libs/Errors.sol";
import {Percentages} from "../../../libs/Percentages.sol";
import {LibKrAsset} from "../../libs/LibKrAsset.sol";

import {StabilityRateConfig} from "../../InterestRateState.sol";
import {cps, CollateralPoolState} from "../CollateralPoolState.sol";
import {ms} from "../../../minter/MinterStorage.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title Internal functions for shared collateral pool.
 */
library LibCollateralPool {
    using WadRay for uint256;
    using WadRay for uint128;
    using Percentages for uint256;

    /**
     * @notice Accumulates a fees of asset swaps to the deposits as a fixed, instantaneous income.
     * @param self Collateral Pool State
     * @param _collateralAsset asset
     * @param _amount amount to accumulate
     * @return nextLiquidityIndex The next liquidity index of the reserve
     */
    function cumulateIncome(
        CollateralPoolState storage self,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 nextLiquidityIndex) {
        //next liquidity index is calculated this way: `((amount / totalLiquidity) + 1) * liquidityIndex`
        //division `amount / totalLiquidity` done in ray for precision
        uint256 result = (_amount.wadToRay().rayDiv(self.collateralDeposits[_collateralAsset].wadToRay()) + WadRay.RAY)
            .rayMul(self.poolCollateral[_collateralAsset].liquidityIndex);
        self.poolCollateral[_collateralAsset].liquidityIndex = uint128(result);
        return result;
    }

    /**
     * @notice Checks whether the shared debt pool can be liquidated.
     * @param self Collateral Pool State
     */
    function isLiquidatable(CollateralPoolState storage self) internal view returns (bool) {
        return self.totalKrAssetValueAtRatio(self.liquidationThreshold, false) > self.totalCollateralValue(false);
    }

    /**
     * @notice Records a deposit of collateral asset.
     * @param self Collateral Pool State
     * @param _account depositor
     * @param _collateralAsset collateral asset
     * @param _depositAmount amount of collateral asset to deposit
     */
    function recordCollateralDeposit(
        CollateralPoolState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        self.collateralDeposits[_collateralAsset] += _depositAmount;
        self.collateralDepositsAccount[_account][_collateralAsset] += _depositAmount.wadToRay().rayDiv(
            self.poolCollateral[_collateralAsset].liquidityIndex
        );
    }

    /**
     * @notice Records a withdrawal of collateral asset.
     * @param self Collateral Pool State
     * @param _account withdrawer
     * @param _collateralAsset collateral asset
     * @param _withdrawalAmount amount of collateral asset to withdraw
     */
    function verifyAndRecordCollateralWithdrawal(
        CollateralPoolState storage self,
        address _account,
        address _collateralAsset,
        uint256 _withdrawalAmount
    ) internal returns (uint256 collateralOut) {
        // record global principal
        self.collateralDeposits[_collateralAsset] -= _withdrawalAmount;

        // get deposits with income
        uint256 normalizedBalance = self.collateralDepositsAccount[_account][_collateralAsset].wadToRay().rayMul(
            self.poolCollateral[_collateralAsset].liquidityIndex
        );
        // sanity check here
        require(normalizedBalance > 0, "withdrawal-bal-0");

        // if the withdrawal amount is greater than the account's normalized balance, return the full balance
        if (normalizedBalance <= _withdrawalAmount) {
            self.collateralDepositsAccount[_account][_collateralAsset] = 0;
            collateralOut = normalizedBalance;
        } else {
            // record new scaled balance
            self.collateralDepositsAccount[_account][_collateralAsset] -= _withdrawalAmount.wadToRay().rayDiv(
                self.poolCollateral[_collateralAsset].liquidityIndex
            );
            collateralOut = _withdrawalAmount;
        }

        // ensure that global pool is left with CR over MCR.
        require(
            self.postWithdrawRatioCheck(_collateralAsset, collateralOut, self.minimumCollateralizationRatio),
            "withdrawal-cr"
        );
    }

    /**
     * @notice Checks whether the collateral ratio after withdrawal is equal to or above to ratio supplied.
     * @param self Collateral Pool State
     * @param _collateralAsset collateral asset
     * @param _withdrawalAmount amount of collateral asset to withdraw
     * @param _collateralRatio ratio to check
     */
    function postWithdrawRatioCheck(
        CollateralPoolState storage self,
        address _collateralAsset,
        uint256 _withdrawalAmount,
        uint256 _collateralRatio
    ) internal view returns (bool) {
        // total collateral and withdrawal value
        (uint256 totalValue, uint256 withdrawalValue) = self.totalCollateralValue(
            _collateralAsset,
            _withdrawalAmount,
            false // dont ignore cFactor
        );

        // value taken out
        uint256 collateralValueAfter = totalValue - withdrawalValue;
        // total krAsset value, dont ignore kFactor.
        return collateralValueAfter >= self.totalKrAssetValueAtRatio(_collateralRatio, false);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Value Calculations                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param self Collateral Pool State
     * @param _ratio ratio
     * @param _ignorekFactor ignore kFactor
     * @return totalValue value in USD
     */
    function totalKrAssetValueAtRatio(
        CollateralPoolState storage self,
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.enabledKreskoAssets;
        for (uint256 i; i < assets.length; i++) {
            totalValue += self.poolKrAssetValue(assets[i], _ignorekFactor);
        }

        // If we are ignoring factors, we don't need to multiply by the minimum collateralization ratio.
        if (_ratio == 1 ether) {
            return totalValue;
        }

        return totalValue.wadMul(_ratio);
    }

    /**
     * @notice Calculates the total collateral value of collateral assets in the pool.
     * @param self Collateral Pool State
     * @param _ignoreFactors whether to ignore factors
     * @return totalValue total collateral value
     */
    function totalCollateralValue(
        CollateralPoolState storage self,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.enabledCollaterals;
        for (uint256 i; i < assets.length; i++) {
            totalValue += self.poolCollateralAssetValue(assets[i], _ignoreFactors);
        }
    }

    /**
     * @notice Returns the value of the collateral asset in the pool and the value of the amount.
     * Saves gas for getting the values in the same execution.
     * @param self Collateral Pool State
     * @param _collateralAsset collateral asset
     * @param _amount amount of collateral asset
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function totalCollateralValue(
        CollateralPoolState storage self,
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue, uint256 amountValue) {
        address[] memory assets = self.enabledCollaterals;
        for (uint256 i; i < assets.length; i++) {
            address asset = assets[i];
            (FixedPoint.Unsigned memory assetValue, FixedPoint.Unsigned memory price) = ms()
                .getCollateralValueAndOraclePrice(
                    asset,
                    ms().getCollateralAmount(asset, self.collateralDeposits[asset]),
                    _ignoreFactors
                );

            totalValue += assetValue.rawValue;
            if (asset == _collateralAsset) {
                amountValue = _amount.wadMul(price.rawValue);
            }
        }
    }

    /**
     * @notice Returns the collateral value of a single asset in the pool.
     * Performs possible rebasing conversions for the pool balance.
     * @param self Collateral Pool State
     * @param _collateralAsset collateral asset
     * @param _ignoreFactors whether to ignore the collateral factor
     * @return value The collateral value in USD
     */
    function poolCollateralAssetValue(
        CollateralPoolState storage self,
        address _collateralAsset,
        bool _ignoreFactors
    ) internal view returns (uint256 value) {
        (FixedPoint.Unsigned memory collateralValue, ) = ms().getCollateralValueAndOraclePrice(
            _collateralAsset,
            ms().getCollateralAmount(_collateralAsset, self.collateralDeposits[_collateralAsset]),
            _ignoreFactors
        );

        return collateralValue.rawValue;
    }

    /**
     * @notice Returns the krAsset value of a single asset in the pool.
     * Performs possible rebasing conversions for the pool balance.
     * @param self Collateral Pool State
     * @param _kreskoAsset krAsset
     * @param _ignorekFactor whether to ignore the k factor
     * @return value The krAsset value in USD
     */
    function poolKrAssetValue(
        CollateralPoolState storage self,
        address _kreskoAsset,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        FixedPoint.Unsigned memory krAssetValue = ms().getKrAssetValue(
            _kreskoAsset,
            ms().getKreskoAssetAmount(_kreskoAsset, self.kreskoAssetDebt[_kreskoAsset]),
            _ignorekFactor
        );
        return krAssetValue.rawValue;
    }

    // function recordCollateralSwap(
    //     CollateralPoolState storage self,
    //     address _account,
    //     address _fromAsset,
    //     address _toAsset,
    //     uint256 _swapAmount,
    //     uint256 _swapPremium,
    //     bool _isDeposit
    // ) internal {
    //     // record global principal
    //     self.collateralDeposits[_collateralAsset] += _swapAmount;

    //     // get deposits with income
    //     uint256 normalizedBalance = self.collateralDepositsAccount[_account][_collateralAsset].wadToRay().rayMul(
    //         self.poolCollateral[_collateralAsset].liquidityIndex
    //     );

    //     // record new scaled balance
    //     if (_isDeposit) {
    //         self.collateralDepositsAccount[_account][_collateralAsset] += _swapAmount.wadToRay().rayDiv(
    //             self.poolCollateral[_collateralAsset].liquidityIndex
    //         );
    //     } else {
    //         self.collateralDepositsAccount[_account][_collateralAsset] -= _swapAmount.wadToRay().rayDiv(
    //             self.poolCollateral[_collateralAsset].liquidityIndex
    //         );
    //     }

    //     // record income
    //     self.collateralDepositsAccount[_account][_collateralAsset] += _swapPremium.wadToRay().rayDiv(
    //         self.poolCollateral[_collateralAsset].liquidityIndex
    //     );

    //     // record income
    //     self.collateralDepositsAccount[_account][_collateralAsset] += _swapPremium.wadToRay().rayDiv(
    //         self.poolCollateral[_collateralAsset].liquidityIndex
    //     );
    // }

    // /**
    //  * @notice Get the current price rate between AMM and oracle pricing
    //  * @dev Raw return value of ammPrice == 0 when no AMM pair exists OR liquidity of the pair does not qualify
    //  * @param self rate configuration for the asset
    //  * @return priceRate the current price rate
    //  */
    // function getPriceRate(StabilityRateConfig storage self) internal view returns (uint256 priceRate) {
    //     FixedPoint.Unsigned memory oraclePrice = ms().getKrAssetValue(self.asset, 1 ether, true);
    //     FixedPoint.Unsigned memory ammPrice = ms().getKrAssetAMMPrice(self.asset, 1 ether);
    //     // no pair, no effect
    //     if (ammPrice.rawValue == 0) {
    //         return 0;
    //     }
    //     return ammPrice.div(oraclePrice).div(10).rawValue;
    // }
}
