// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {LibAmounts} from "./LibAmounts.sol";
import {LibDecimals} from "minter/libs/LibDecimals.sol";
import {scdp, SCDPState} from "scdp/SCDPStorage.sol";
import {sdi} from "scdp/SDIStorage.sol";
import {ms} from "minter/MinterStorage.sol";
import {CollateralAsset} from "minter/MinterTypes.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title Internal functions for SCDP
 */
library LibSCDP {
    using WadRay for uint256;
    using WadRay for uint128;
    using LibAmounts for SCDPState;
    using LibSCDP for SCDPState;
    using LibDecimals for uint8;

    /**
     * @notice Records a deposit of collateral asset.
     * @dev Saves principal, scaled and global deposit amounts.
     * @param _account depositor
     * @param _collateralAsset the collateral asset
     * @param _depositAmount amount of collateral asset to deposit
     */
    function recordCollateralDeposit(
        SCDPState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        require(self.isEnabled[_collateralAsset], "asset-disabled");
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

        require(
            self.totalDeposits[_collateralAsset] <= self.poolCollateral[_collateralAsset].depositLimit,
            "deposit-limit"
        );
    }

    /**
     * @notice Records a withdrawal of collateral asset.
     * @param self Collateral Pool State
     * @param _account withdrawer
     * @param _collateralAsset collateral asset
     * @param collateralOut The actual amount of collateral withdrawn
     */
    function recordCollateralWithdrawal(
        SCDPState storage self,
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 collateralOut, uint256 feesOut) {
        // Do not check for isEnabled, always allow withdrawals.

        // Get accounts principal deposits.
        uint256 depositsPrincipal = self.getAccountPrincipalDeposits(_account, _collateralAsset);

        if (depositsPrincipal >= _amount) {
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
            collateralOut = depositsPrincipal;
            // 2. With fees.
            feesOut = self.getAccountDepositsWithFees(_account, _collateralAsset) - depositsPrincipal;
            // 3. Ensure this is actually the case.
            require(feesOut > 0, "withdrawal-violation");
            // 4. Wipe account collateral deposits.
            self.depositsPrincipal[_account][_collateralAsset] = 0;
            self.deposits[_account][_collateralAsset] = 0;
            // 5. Reduce global by ONLY by the principal, fees are not collateral.
            self.totalDeposits[_collateralAsset] -= LibAmounts.getCollateralAmountWrite(
                _collateralAsset,
                depositsPrincipal
            );
        }
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param self Collateral Pool State
     * @param _collateralRatio ratio to check
     */
    function checkRatioWithdrawal(SCDPState storage self, uint256 _collateralRatio) internal view returns (bool) {
        return
            self.getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= self.getTotalPoolKrAssetValueAtRatio(_collateralRatio, false); // dont ignore kFactors or MCR;
    }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param self Collateral Pool State
     * @param _collateralRatio ratio to check
     */
    function checkRatio(SCDPState storage self, uint256 _collateralRatio) internal view returns (bool) {
        return
            self.getTotalPoolDepositValue(
                false // dont ignore cFactor
            ) >= sdi().effectiveDebtUSD().wadMul(_collateralRatio);
    }

    /**
     * @notice Checks whether the shared debt pool can be liquidated.
     * @param self Collateral Pool State
     */
    function isLiquidatable(SCDPState storage self) internal view returns (bool) {
        return !self.checkRatio(self.liquidationThreshold);
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
        SCDPState storage self,
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += ms().getKrAssetValue(asset, ms().getKreskoAssetAmount(asset, self.debt[asset]), _ignorekFactor);
            unchecked {
                i++;
            }
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
        SCDPState storage self,
        bool _ignoreFactors
    ) internal view returns (uint256 value) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getPoolDeposits(asset),
                _ignoreFactors
            );
            value += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral asset in the pool and the value of the amount.
     * Saves gas for getting the values in the same execution.
     * @param _collateralAsset collateral asset
     * @param _amount amount of collateral asset
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function getTotalPoolDepositValue(
        SCDPState storage self,
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue, uint256 amountValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, uint256 price) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getPoolDeposits(asset),
                _ignoreFactors
            );

            totalValue += assetValue;
            if (asset == _collateralAsset) {
                CollateralAsset memory collateral = ms().collateralAssets[_collateralAsset];
                amountValue = collateral.decimals.toWad(_amount).wadMul(
                    _ignoreFactors ? price : price.wadMul(collateral.factor)
                );
            }

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account`.
     * @param _account account
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function getAccountTotalDepositValuePrincipal(
        SCDPState storage self,
        address _account,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getAccountPrincipalDeposits(_account, asset),
                _ignoreFactors
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral assets in the pool for `_account` with fees.
     * @notice Ignores all factors.
     * @param _account account
     */
    function getAccountTotalDepositValueWithFees(
        SCDPState storage self,
        address _account
    ) internal view returns (uint256 totalValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = ms().getCollateralValueAndOraclePrice(
                asset,
                self.getAccountDepositsWithFees(_account, asset),
                true
            );

            totalValue += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /// @notice This function seizes collateral from the shared pool
    /// @notice Adjusts all deposits in the case where swap deposits do not cover the amount.
    function adjustSeizedCollateral(SCDPState storage self, address _seizeAsset, uint256 _seizeAmount) internal {
        uint256 swapDeposits = self.getPoolSwapDeposits(_seizeAsset); // current "swap" collateral

        if (swapDeposits >= _seizeAmount) {
            uint256 amountOutInternal = LibAmounts.getCollateralAmountWrite(_seizeAsset, _seizeAmount);
            // swap deposits cover the amount
            self.swapDeposits[_seizeAsset] -= amountOutInternal;
            self.totalDeposits[_seizeAsset] -= amountOutInternal;
        } else {
            // swap deposits do not cover the amount
            uint256 amountToCover = _seizeAmount - swapDeposits;
            // reduce everyones deposits by the same ratio
            self.poolCollateral[_seizeAsset].liquidityIndex -= uint128(
                amountToCover.wadToRay().rayDiv(self.getUserPoolDeposits(_seizeAsset).wadToRay())
            );
            self.swapDeposits[_seizeAsset] = 0;
            self.totalDeposits[_seizeAsset] -= LibAmounts.getCollateralAmountWrite(_seizeAsset, amountToCover);
        }
    }
}
