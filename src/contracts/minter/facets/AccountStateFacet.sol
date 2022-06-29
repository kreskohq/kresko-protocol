// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IAccountState} from "../interfaces/IAccountState.sol";
import {Action, KrAsset, CollateralAsset, FixedPoint} from "../MinterTypes.sol";
import {ms} from "../MinterStorage.sol";

contract AccountStateFacet is IAccountState {
    using FixedPoint for FixedPoint.Unsigned;

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256) {
        return ms().getMintedKreskoAssetsIndex(_account, _kreskoAsset);
    }

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(address _account) external view returns (address[] memory) {
        return ms().mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets the Kresko asset value in USD of a particular account.
     * @param _account The account to calculate the Kresko asset value for.
     * @return The Kresko asset value of a particular account.
     */
    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountKrAssetValue(_account);
    }

    /**
     * @notice Get `_account` debt amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of debt for `_asset`
     */
    function kreskoAssetDebt(address _account, address _asset) external view returns (uint256) {
        return ms().kreskoAssetDebt[_account][_asset];
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getDepositedCollateralAssets(address _account) external view returns (address[] memory) {
        return ms().depositedCollateralAssets[_account];
    }

    /**
     * @notice Get `_account` collateral deposit amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of collateral deposited for `_asset`
     */
    function collateralDeposits(address _account, address _asset) external view returns (uint256) {
        return ms().collateralDeposits[_account][_asset];
    }

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function getDepositedCollateralAssetIndex(address _account, address _collateralAsset)
        external
        view
        returns (uint256 i)
    {
        for (i; i < ms().depositedCollateralAssets[_account].length; i++) {
            if (ms().depositedCollateralAssets[_account][i] == _collateralAsset) {
                break;
            }
        }
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return The collateral value of a particular account.
     */
    function getAccountCollateralValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountCollateralValue(_account);
    }

    /**
     * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy
     * and therefore to avoid liquidations users should maintain a collateral value higher than the value returned.
     * @param _account The account to calculate the minimum collateral value for.
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinimumCollateralValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountMinimumCollateralValue(_account);
    }

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratio for an `_account`
     */
    function getAccountCollateralRatio(address _account) public view returns (FixedPoint.Unsigned memory ratio) {
        FixedPoint.Unsigned memory collateralValue = ms().getAccountCollateralValue(_account);
        if (collateralValue.rawValue == 0) {
            return FixedPoint.Unsigned(0);
        }
        ratio = collateralValue.div(getAccountMinimumCollateralValue(_account));
    }

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratios of the accounts
     */
    function getCollateralRatiosFor(address[] calldata _accounts) external view returns (FixedPoint.Unsigned[] memory) {
        FixedPoint.Unsigned[] memory ratios = new FixedPoint.Unsigned[](_accounts.length);
        for (uint256 i; i < _accounts.length; i++) {
            ratios[i] = getAccountCollateralRatio(_accounts[i]);
        }
        return ratios;
    }
}
