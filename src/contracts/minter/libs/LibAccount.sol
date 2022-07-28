// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {MinterState} from "../MinterState.sol";

library LibAccount {
    using FixedPoint for FixedPoint.Unsigned;

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(MinterState storage self, address _account)
        internal
        view
        returns (address[] memory)
    {
        return self.mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getDepositedCollateralAssets(MinterState storage self, address _account)
        internal
        view
        returns (address[] memory)
    {
        return self.depositedCollateralAssets[_account];
    }

    /**
     * @notice Calculates if an account's current collateral value is under its minimum collateral value.
     * @dev Returns true if the account's current collateral value is below the minimum collateral value.
     * required to consider the position healthy.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(MinterState storage self, address _account) internal view returns (bool) {
        return FixedPoint.fromUnscaledUint(self.getAccountCollateralValue(_account).rawValue).isLessThan(
            self.getAccountMinimumCollateralValueAtRatio(_account, self.liquidationThreshold));
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return The collateral value of a particular account.
     */
    function getAccountCollateralValue(MinterState storage self, address _account)
        internal
        view
        returns (FixedPoint.Unsigned memory)
    {
        FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            (FixedPoint.Unsigned memory collateralValue, ) = self.getCollateralValueAndOraclePrice(
                asset,
                self.collateralDeposits[_account][asset],
                false // Take the collateral factor into consideration. // TODO: should this take the collateral factor into account?
            );
            totalCollateralValue = totalCollateralValue.add(collateralValue);
        }

        return totalCollateralValue;
    }

    /**
  * @notice Get an account's minimum collateral value required to back a Kresko asset amount at a given collateralization ratio.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy,
     *      accounts with their collateral value under the liquidation threshold are considered liquidatable.
     * @param _account The account to calculate the minimum collateral value for.
     * @param _ratio The collateralization ratio required: higher ratio = more collateral required
     * @return The minimum collateral value at a given collateralization ratio for a given account.
     */
    function getAccountMinimumCollateralValueAtRatio(
        MinterState storage self,
        address _account,
        FixedPoint.Unsigned memory _ratio
    )
        internal
        view
        returns (FixedPoint.Unsigned memory)
    {
        FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 amount = self.kreskoAssetDebt[_account][asset];
            minCollateralValue = minCollateralValue.add(self.getMinimumCollateralValueAtRatio(asset, amount, _ratio));
        }

        return minCollateralValue;
    }

    /**
     * @notice Gets the Kresko asset value in USD of a particular account.
     * @param _account The account to calculate the Kresko asset value for.
     * @return The Kresko asset value of a particular account.
     */
    function getAccountKrAssetValue(MinterState storage self, address _account)
        internal
        view
        returns (FixedPoint.Unsigned memory)
    {
        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(0);

        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            value = value.add(self.getKrAssetValue(asset, self.kreskoAssetDebt[_account][asset], false));
        }
        return value;
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return i = index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(
        MinterState storage self,
        address _account,
        address _kreskoAsset
    ) internal view returns (uint256 i) {
        for (i; i < self.mintedKreskoAssets[_account].length; i++) {
            if (self.mintedKreskoAssets[_account][i] == _kreskoAsset) {
                break;
            }
        }
    }

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function getDepositedCollateralAssetIndex(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 i) {
        for (i; i < self.depositedCollateralAssets[_account].length; i++) {
            if (self.depositedCollateralAssets[_account][i] == _collateralAsset) {
                break;
            }
        }
    }
}
