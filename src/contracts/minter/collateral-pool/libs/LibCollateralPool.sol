// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;

import {SafeERC20, IERC20Permit} from "../../../shared/SafeERC20.sol";
import {WadRay} from "../../../libs/WadRay.sol";
import {LibAmounts} from "./LibAmounts.sol";
import {cps, CollateralPoolState} from "../CollateralPoolState.sol";
import {ms} from "../../MinterStorage.sol";

// import {Error} from "../../../libs/Errors.sol";
// import {StabilityRateConfig} from "../../InterestRateState.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title Internal functions for shared collateral pool.
 */
library LibCollateralPool {
    using WadRay for uint256;
    using WadRay for uint128;
    using LibAmounts for CollateralPoolState;
    using LibCollateralPool for CollateralPoolState;

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _account depositor
     * @param _collateralAsset the collateral asset
     * @param _depositAmount amount of collateral asset to deposit
     */
    function recordCollateralDeposit(
        CollateralPoolState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        require(self.isEnabled[_collateralAsset], "asset-in-disabled");
        uint256 depositAmount = LibAmounts.getCollateralAmountWrite(_collateralAsset, _depositAmount);
        unchecked {
            // Save global deposits.
            self.totalDeposits[_collateralAsset] += depositAmount;
            // Save principal deposits.
            self.depositsPrincipal[_account][_collateralAsset] += depositAmount;
            // Save scaled deposits.
            self.deposits[_account][_collateralAsset] += depositAmount.wadToRay().rayDiv(
                self.poolCollateral[_collateralAsset].liquidityIndex
            );
        }
    }

    /**
     * @notice Records a withdrawal of collateral asset.
     * @param self Collateral Pool State
     * @param _account withdrawer
     * @param _collateralAsset collateral asset
     * @param collateralOut The actual amount of collateral withdrawn
     */
    function recordCollateralWithdrawal(
        CollateralPoolState storage self,
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 collateralOut, uint256 feesOut) {
        // Do not check for isEnabled, always allow withdrawals.

        // Get accounts principal deposits.
        uint256 principalDeposits = self.getAccountPrincipalDeposits(_account, _collateralAsset);

        // Sanity check
        require(principalDeposits > 0, "no-collateral-deposited");

        if (principalDeposits > _amount) {
            // == Principal can cover possibly rebased `_amount` requested.
            // 1. We send out the requested amount.
            collateralOut = _amount;
            // 2. No fees.
            // 3. Possibly un-rebased amount for internal bookeeping.
            uint256 withdrawAmountInternal = LibAmounts.getCollateralAmountWrite(_collateralAsset, _amount);
            unchecked {
                // 4. Reduce global deposits.
                self.totalDeposits[_collateralAsset] -= withdrawAmountInternal;
                // 5. Reduce principal deposits.
                self.depositsPrincipal[_account][_collateralAsset] -= withdrawAmountInternal;
                // 6. Reduce scaled deposits.
                self.deposits[_account][_collateralAsset] -= withdrawAmountInternal.wadToRay().rayDiv(
                    self.poolCollateral[_collateralAsset].liquidityIndex
                );
            }
        } else {
            // == Principal can't cover possibly rebased `_amount` requested, send full collateral available.
            // 1. We send all collateral.
            collateralOut = principalDeposits;
            // 2. With fees.
            feesOut = self.getAccountDeposits(_account, _collateralAsset) - principalDeposits;
            // 3. Ensure this is actually the case.
            require(feesOut > 0, "withdrawal-violation");
            // 4. Wipe account collateral deposits.
            self.depositsPrincipal[_account][_collateralAsset] = 0;
            self.deposits[_account][_collateralAsset] = 0;
            // 5. Reduce global by ONLY by the principal, fees are not collateral.
            self.totalDeposits[_collateralAsset] -= LibAmounts.getCollateralAmountWrite(
                _collateralAsset,
                principalDeposits
            );
        }
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param self Collateral Pool State
     * @param _collateralRatio ratio to check
     */
    function checkRatio(CollateralPoolState storage self, uint256 _collateralRatio) internal view returns (bool) {
        return
            self.getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= self.getTotalPoolKrAssetValueAtRatio(_collateralRatio, false); // dont ignore kFactors or MCR;
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied after withdrawal.
     * @param self Collateral Pool State
     * @param _collateralAsset collateral asset
     * @param _withdrawalAmount amount of collateral asset to withdraw
     * @param _collateralRatio ratio to check
     */
    function checkRatio(
        CollateralPoolState storage self,
        address _collateralAsset,
        uint256 _withdrawalAmount,
        uint256 _collateralRatio
    ) internal view returns (bool) {
        // total collateral and withdrawal value
        (uint256 totalValue, uint256 withdrawalValue) = self.getTotalPoolDepositValue(
            _collateralAsset,
            _withdrawalAmount,
            false // dont ignore cFactor
        );
        return totalValue - withdrawalValue >= self.getTotalPoolKrAssetValueAtRatio(_collateralRatio, false); // dont ignore collaterRatio.
    }

    /**
     * @notice Checks whether the shared debt pool can be liquidated.
     * @param self Collateral Pool State
     */
    function isLiquidatable(CollateralPoolState storage self) internal view returns (bool) {
        return self.checkRatio(self.liquidationThreshold);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Value Calculations                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param self Collateral Pool State
     * @param _ratio ratio
     * @param _ignorekFactor ignore kFactor
     * @return value in USD
     */
    function getTotalPoolKrAssetValueAtRatio(
        CollateralPoolState storage self,
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; i++) {
            address asset = assets[i];
            value += ms().getKrAssetValue(asset, ms().getKreskoAssetAmount(asset, self.debt[asset]), _ignorekFactor);
        }

        // We dont need to multiply this.
        if (_ratio == 1 ether) {
            return value;
        }

        return value.wadMul(_ratio);
    }

    /**
     * @notice Calculates the total collateral value of collateral assets in the pool.
     * @param self Collateral Pool State
     * @param _ignoreFactors whether to ignore factors
     * @return value in USD
     */
    function getTotalPoolDepositValue(
        CollateralPoolState storage self,
        bool _ignoreFactors
    ) internal view returns (uint256 value) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; i++) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getPoolDeposits(asset),
                _ignoreFactors
            );
            value += assetValue;
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
    function getTotalPoolDepositValue(
        CollateralPoolState storage self,
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue, uint256 amountValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; i++) {
            address asset = assets[i];
            (uint256 assetValue, uint256 price) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getPoolDeposits(asset),
                _ignoreFactors
            );

            totalValue += assetValue;
            if (asset == _collateralAsset) {
                amountValue = _amount.wadMul(price);
            }
        }
    }

    // /**
    //  * @notice Returns the krAsset value of a single asset in the pool.
    //  * Performs possible rebasing conversions for the pool balance.
    //  * @param self Collateral Pool State
    //  * @param _kreskoAsset krAsset
    //  * @param _ignorekFactor whether to ignore the k factor
    //  * @return value The krAsset value in USD
    //  */
    // function getPoolKrAssetValue(
    //     CollateralPoolState storage self,
    //     address _kreskoAsset,
    //     bool _ignorekFactor
    // ) internal view returns (uint256 value) {

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
