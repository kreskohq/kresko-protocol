// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Arrays} from "libs/Arrays.sol";
import {WadRay} from "libs/WadRay.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";

import {Error} from "common/Errors.sol";
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
        require(_depositAmount > 0, Error.ZERO_DEPOSIT);
        Asset memory asset = cs().assets[_collateralAsset];
        // If the account does not have an existing deposit for this collateral asset,
        // push it to the list of the account's deposited collateral assets.
        uint256 existingCollateralAmount = self.accountCollateralAmount(_account, _collateralAsset, asset);

        if (existingCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].push(_collateralAsset);
        }

        uint256 newCollateralAmount = existingCollateralAmount + _depositAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (asset.anchor != address(0)) {
            require(
                newCollateralAmount >= Constants.MIN_KRASSET_COLLATERAL_AMOUNT || newCollateralAmount == 0,
                Error.COLLATERAL_AMOUNT_TOO_LOW
            );
        }

        // Record the deposit.
        unchecked {
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
        Asset memory _asset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _collateralIndex
    ) internal {
        require(_withdrawAmount > 0, Error.ZERO_WITHDRAW);
        require(_collateralIndex <= self.depositedCollateralAssets[_account].length - 1, Error.ARRAY_OUT_OF_BOUNDS);
        // Ensure that the operation passes checks MCR checks
        verifyAccountCollateral(self, _account, _asset, _withdrawAmount);

        uint256 newCollateralAmount = _collateralDeposits - _withdrawAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (_asset.anchor != address(0)) {
            require(
                newCollateralAmount >= Constants.MIN_KRASSET_COLLATERAL_AMOUNT || newCollateralAmount == 0,
                Error.COLLATERAL_AMOUNT_TOO_LOW
            );
        }

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (newCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralIndex);
        }

        // Record the withdrawal.
        self.collateralDeposits[_account][_collateralAsset] = _asset.toNonRebasingAmount(newCollateralAmount);

        emit MEvent.CollateralWithdrawn(_account, _collateralAsset, _withdrawAmount);
    }

    /**
     * @notice records the collateral withdrawal
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _asset The collateral asset struct.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _collateralDeposits Collateral deposits for the account.
     * @param _depositedCollateralAssetIndex Index of the collateral asset in the account's deposited collateral assets array.
     */
    function recordWithdrawal(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        Asset memory _asset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _depositedCollateralAssetIndex
    ) internal {
        require(_withdrawAmount > 0, Error.ZERO_WITHDRAW);
        require(
            _depositedCollateralAssetIndex <= self.depositedCollateralAssets[_account].length - 1,
            Error.ARRAY_OUT_OF_BOUNDS
        );
        // ensure that the handler does not attempt to withdraw more collateral than the account has
        require(_collateralDeposits >= _withdrawAmount, Error.COLLATERAL_INSUFFICIENT_AMOUNT);
        uint256 newCollateralAmount = _collateralDeposits - _withdrawAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (_asset.anchor != address(0)) {
            require(
                newCollateralAmount >= Constants.MIN_KRASSET_COLLATERAL_AMOUNT || newCollateralAmount == 0,
                Error.COLLATERAL_AMOUNT_TOO_LOW
            );
        }

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (newCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _depositedCollateralAssetIndex);
        }

        // Record the withdrawal.
        self.collateralDeposits[_account][_collateralAsset] = _asset.toNonRebasingAmount(newCollateralAmount);

        emit MEvent.UncheckedCollateralWithdrawn(_account, _collateralAsset, _withdrawAmount);
    }

    /**
     * @notice verifies that the account collateral
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     */

    function verifyAccountCollateral(
        MinterState storage self,
        address _account,
        Asset memory _collateralAsset,
        uint256 _withdrawAmount
    ) internal view {
        // Ensure the withdrawal does not result in the account having a collateral value
        // under the minimum collateral amount required to maintain a healthy position.
        // I.e. the new account's collateral value must still exceed the account's minimum
        // collateral value.
        // Get the account's current collateral value.
        uint256 collateralValue = self.accountCollateralValue(_account);
        // Get the collateral value that the account will lose as a result of this withdrawal.
        (uint256 withdrawnCollateralValue, ) = _collateralAsset.collateralAmountToValue(
            _withdrawAmount,
            false // Take the collateral factor into consideration.
        );
        // Get the account's minimum collateral value.
        uint256 minCollateralValue = self.accountMinCollateralAtRatio(_account, self.minCollateralRatio);
        // Require accountMinCollateralValue <= accountCollateralValue - withdrawnCollateralValue.
        require(minCollateralValue <= collateralValue - withdrawnCollateralValue, Error.COLLATERAL_INSUFFICIENT_AMOUNT);
    }
}
