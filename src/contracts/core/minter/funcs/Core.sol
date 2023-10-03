// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "libs/Arrays.sol";
import {WadRay} from "libs/WadRay.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {CError} from "common/CError.sol";
import {Asset} from "common/Types.sol";
import {cs} from "common/State.sol";
import {Constants} from "common/Constants.sol";

import {MEvent} from "minter/Events.sol";
import {MinterState} from "minter/State.sol";

library MCore {
    using Arrays for address[];
    using WadRay for uint256;

    /* -------------------------------------------------------------------------- */
    /*                            Kresko Assets Actions                           */
    /* -------------------------------------------------------------------------- */

    function mint(MinterState storage self, address _kreskoAsset, address _anchor, uint256 _amount, address _account) internal {
        // Increase principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] += IKreskoAssetIssuer(_anchor).issue(_amount, _account);
    }

    /// @notice Repay user kresko asset debt.
    /// @dev Updates the principal in MinterState
    /// @param _kreskoAsset the asset being repaid
    /// @param _anchor the anchor token of the asset being repaid
    /// @param _burnAmount the asset amount being burned
    /// @param _account the account the debt is subtracted from
    function burn(
        MinterState storage self,
        address _kreskoAsset,
        address _anchor,
        uint256 _burnAmount,
        address _account
    ) internal {
        // Decrease the principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] -= IKreskoAssetIssuer(_anchor).destroy(_burnAmount, msg.sender);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Collateral Actions                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Records account as having deposited an amount of a collateral asset.
     * @dev Token transfers are expected to be done by the caller.
     * @param _account The address of the collateral asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _depositAmount The amount of the collateral asset deposited.
     */
    function handleDeposit(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        // Because the depositedCollateralAssets[_account] is pushed to if the existing
        // deposit amount is 0, require the amount to be > 0. Otherwise, the depositedCollateralAssets[_account]
        // could be filled with duplicates, causing collateral to be double-counted in the collateral value.
        if (_depositAmount == 0) revert CError.ZERO_DEPOSIT(_collateralAsset);

        Asset storage asset = cs().assets[_collateralAsset];
        // If the account does not have an existing deposit for this collateral asset,
        // push it to the list of the account's deposited collateral assets.
        uint256 existingCollateralAmount = self.accountCollateralAmount(_account, _collateralAsset, asset);

        if (existingCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].push(_collateralAsset);
        }

        unchecked {
            uint256 newCollateralAmount = existingCollateralAmount + _depositAmount;

            // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
            // This is done because kresko assets can be rebased.
            if (asset.anchor != address(0)) {
                if (newCollateralAmount < Constants.MIN_KRASSET_COLLATERAL_AMOUNT && newCollateralAmount > 0) {
                    revert CError.COLLATERAL_VALUE_LOW(newCollateralAmount, Constants.MIN_KRASSET_COLLATERAL_AMOUNT);
                }
            }

            // Record the deposit.
            self.collateralDeposits[_account][_collateralAsset] = asset.toNonRebasingAmount(newCollateralAmount);
        }

        emit MEvent.CollateralDeposited(_account, _collateralAsset, _depositAmount);
    }

    /**
     * @notice Verifies that the account has sufficient collateral for the requested amount and records the collateral
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _collateralDeposits Collateral deposits for the account.
     * @param _collateralIndex Index of the collateral asset in the account's deposited collateral assets array.
     */
    function handleWithdrawal(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        Asset storage _asset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _collateralIndex
    ) internal {
        self.checkCollateralParams(_account, _collateralAsset, _collateralIndex, _withdrawAmount);

        uint256 newCollateralAmount = _collateralDeposits - _withdrawAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (_asset.anchor != address(0)) {
            if (newCollateralAmount < Constants.MIN_KRASSET_COLLATERAL_AMOUNT && newCollateralAmount > 0) {
                revert CError.COLLATERAL_VALUE_LOW(newCollateralAmount, Constants.MIN_KRASSET_COLLATERAL_AMOUNT);
            }
        }

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (newCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralIndex);
        }

        // Record the withdrawal.
        self.collateralDeposits[_account][_collateralAsset] = _asset.toNonRebasingAmount(newCollateralAmount);

        // Verify that the account has sufficient collateral value left.
        self.checkAccountCollateral(_account);

        emit MEvent.CollateralWithdrawn(_account, _collateralAsset, _withdrawAmount);
    }

    /**
     * @notice records the collateral withdrawal
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _asset The collateral asset struct.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _collateralDeposits Collateral deposits for the account.
     * @param _collateralIndex Index of the collateral asset in the account's deposited collateral assets array.
     */
    function handleUncheckedWithdrawal(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        Asset storage _asset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _collateralIndex
    ) internal {
        self.checkCollateralParams(_account, _collateralAsset, _collateralIndex, _withdrawAmount);
        uint256 newCollateralAmount = _collateralDeposits - _withdrawAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (_asset.anchor != address(0)) {
            if (newCollateralAmount < Constants.MIN_KRASSET_COLLATERAL_AMOUNT && newCollateralAmount > 0) {
                revert CError.COLLATERAL_VALUE_LOW(newCollateralAmount, Constants.MIN_KRASSET_COLLATERAL_AMOUNT);
            }
        }

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (newCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralIndex);
        }

        // Record the withdrawal.
        self.collateralDeposits[_account][_collateralAsset] = _asset.toNonRebasingAmount(newCollateralAmount);

        emit MEvent.UncheckedCollateralWithdrawn(_account, _collateralAsset, _withdrawAmount);
    }

    function checkCollateralParams(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _collateralIndex,
        uint256 _amount
    ) internal view {
        if (_amount == 0) revert CError.ZERO_AMOUNT(_collateralAsset);
        if (_collateralIndex > self.depositedCollateralAssets[_account].length - 1)
            revert CError.INVALID_ASSET_INDEX(
                _collateralAsset,
                _collateralIndex,
                self.depositedCollateralAssets[_account].length - 1
            );
    }

    /**
     * @notice verifies that the account has enough collateral value
     * @param _account The address of the account to verify the collateral for.
     */
    function checkAccountCollateral(MinterState storage self, address _account) internal view {
        uint256 collateralValue = self.accountTotalCollateralValue(_account);
        // Get the account's minimum collateral value.
        uint256 minCollateralValue = self.accountMinCollateralAtRatio(_account, self.minCollateralRatio);

        if (collateralValue < minCollateralValue) {
            revert CError.COLLATERAL_VALUE_LOW(collateralValue, minCollateralValue);
        }
    }

    function maybePushToMintedAssets(MinterState storage self, address _account, address _kreskoAsset) internal {
        bool exists = false;
        uint256 length = self.mintedKreskoAssets[_account].length;
        for (uint256 i; i < length; ) {
            if (self.mintedKreskoAssets[_account][i] == _kreskoAsset) {
                exists = true;
                break;
            }
            unchecked {
                ++i;
            }
        }

        if (!exists) {
            self.mintedKreskoAssets[_account].push(_kreskoAsset);
        }
    }
}
