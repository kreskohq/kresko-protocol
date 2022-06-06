// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "../WithStorage.sol";
import {CollateralAsset} from "../storage/MinterStructs.sol";

contract CollateralFacet is WithStorage {
    /* ==== Collateral ==== */
    /**
     * @notice Returns true if the @param _collateralAsset exists in the protocol
     */
    function collateralExists(address _collateralAsset) external view returns (bool) {
        return ms().collateralAssets[_collateralAsset].exists;
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
        FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = depositedCollateralAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            (FixedPoint.Unsigned memory collateralValue, ) = getCollateralValueAndOraclePrice(
                asset,
                collateralDeposits[_account][asset],
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue = totalCollateralValue.add(collateralValue);
        }

        return totalCollateralValue;
    }

    /**
     * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy
     * and therefore to avoid liquidations users should maintain a collateral value higher than the value returned.
     * @param _account The account to calculate the minimum collateral value for.
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinimumCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory) {
        MinterState s = ms();
        FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = s.mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 amount = kreskoAssetDebt[_account][asset];
            minCollateralValue = minCollateralValue.add(getMinimumCollateralValue(asset, amount));
        }

        return minCollateralValue;
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
    )
        view
        ___ /** TODO: SHARED ORACLE LIB */
        returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory)
    {
        CollateralAsset memory collateralAsset = collateralAssets[_collateralAsset];

        FixedPoint.Unsigned memory fixedPointAmount = collateralAsset.decimals._toCollateralFixedPointAmount(_amount);
        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(collateralAsset.oracle.latestAnswer()));
        FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

        if (!_ignoreCollateralFactor) {
            value = value.mul(collateralAsset.factor);
        }
        return (value, oraclePrice);
    }
}
