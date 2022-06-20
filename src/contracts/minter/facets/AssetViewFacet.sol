// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;
import "../../shared/FP.sol" as FixedPoint;
import {IAssetViewFacet} from "../interfaces/IAssetViewFacet.sol";
import {ms, Action, KrAsset, CollateralAsset} from "../MinterStorage.sol";

contract AssetViewFacet is IAssetViewFacet {
    using FixedPoint.FPMath for FixedPoint.Unsigned;

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns true if the @param _krAsset exists in the protocol
     */
    function krAssetExists(address _krAsset) external view returns (bool) {
        return ms().kreskoAssets[_krAsset].exists;
    }

    /**
     * @notice Get the state of a specific krAsset
     * @param _asset Address of the asset.
     * @return State of assets `KrAsset` struct
     */
    function kreskoAsset(address _asset) external view returns (KrAsset memory) {
        return ms().kreskoAsset(_asset);
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return i = index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256 i) {
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

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) external view returns (FixedPoint.Unsigned memory) {
        return ms().getKrAssetValue(_kreskoAsset, _amount, _ignoreKFactor);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns true if the @param _collateralAsset exists in the protocol
     */
    function collateralExists(address _collateralAsset) external view returns (bool) {
        return ms().collateralAssets[_collateralAsset].exists;
    }

    /**
     * @notice Get the state of a specific collateral asset
     * @param _asset Address of the asset.
     * @return State of assets `CollateralAsset` struct
     */
    function collateralAsset(address _asset) external view returns (CollateralAsset memory) {
        return ms().collateralAsset(_asset);
    }

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
    function getAccountCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountCollateralValue(_account);
    }

    /**
     * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy
     * and therefore to avoid liquidations users should maintain a collateral value higher than the value returned.
     * @param _account The account to calculate the minimum collateral value for.
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinimumCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountMinimumCollateralValue(_account);
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to calculate the collateral value for.
     * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
        return ms().getCollateralValueAndOraclePrice(_collateralAsset, _amount, _ignoreCollateralFactor);
    }

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratios of the accounts
     */
    function getCollateralRatiosFor(address[] memory _accounts)
        external
        view
        returns (FixedPoint.Unsigned[] memory ratios)
    {
        for (uint256 i; i < _accounts.length; i++) {
            ratios[i] = ms().getAccountCollateralValue(_accounts[i]).div(
                ms().getAccountMinimumCollateralValue(_accounts[i])
            );
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                   General                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Check if `_asset` has a pause enabled for `_action`
     * @param _action enum `Action`
     *  Deposit = 0
     *  Withdraw = 1,
     *  Repay = 2,
     *  Borrow = 3,
     *  Liquidate = 4
     * @return true if `_action` is paused
     */
    function assetActionPaused(Action _action, address _asset) external view returns (bool) {
        return ms().safetyState[_asset][_action].pause.enabled;
    }
}
