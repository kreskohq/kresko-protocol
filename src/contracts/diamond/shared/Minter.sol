// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "../storage/MinterStorage.sol";
import "../libraries/FixedPoint.sol";
import "../libraries/FixedPointMath.sol";
import "../libraries/Arrays.sol";

library Minter {
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPointMath for uint8;
    using FixedPointMath for uint256;
    using Arrays for address[];

    /**
     * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy
     * and therefore to avoid liquidations users should maintain a collateral value higher than the value returned.
     * @param _account The account to calculate the minimum collateral value for.
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinimumCollateralValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = MinterStorage.state().mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 amount = MinterStorage.state().kreskoAssetDebt[_account][asset];
            minCollateralValue = minCollateralValue.add(getMinimumCollateralValue(asset, amount));
        }

        return minCollateralValue;
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return The collateral value of a particular account.
     */
    function getAccountCollateralValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = MinterStorage.state().depositedCollateralAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            (FixedPoint.Unsigned memory collateralValue, ) = getCollateralValueAndOraclePrice(
                asset,
                MinterStorage.state().collateralDeposits[_account][asset],
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue = totalCollateralValue.add(collateralValue);
        }

        return totalCollateralValue;
    }

    /**
     * @notice Get the minimum collateral value required to keep a individual debt position healthy.
     * @param _krAsset The address of the Kresko asset.
     * @param _amount The Kresko Asset debt amount.
     * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
     */
    function getMinimumCollateralValue(address _krAsset, uint256 _amount)
        internal
        view
        returns (FixedPoint.Unsigned memory minCollateralValue)
    {
        // Calculate the Kresko asset's value weighted by its k-factor.
        FixedPoint.Unsigned memory weightedKreskoAssetValue = getKrAssetValue(_krAsset, _amount, false);
        // Calculate the minimum collateral required to back this Kresko asset amount.
        return weightedKreskoAssetValue.mul(MinterStorage.state().minimumCollateralizationRatio);
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
    ) internal view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
        MinterState storage ms = MinterStorage.state();
        CollateralAsset memory collateralAsset = ms.collateralAssets[_collateralAsset];

        FixedPoint.Unsigned memory fixedPointAmount = collateralAsset.decimals._toCollateralFixedPointAmount(_amount);
        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(collateralAsset.oracle.latestAnswer()));
        FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

        if (!_ignoreCollateralFactor) {
            value = value.mul(collateralAsset.factor);
        }
        return (value, oraclePrice);
    }

    /**
     * @notice Returns true if the @param _krAsset exists in the protocol
     */
    function krAssetExists(address _krAsset) external view returns (bool) {
        return MinterStorage.state().kreskoAssets[_krAsset].exists;
    }

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(address _account) external view returns (address[] memory) {
        return MinterStorage.state().mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return i = index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) public view returns (uint256 i) {
        for (i; i < MinterStorage.state().mintedKreskoAssets[_account].length; i++) {
            if (MinterStorage.state().mintedKreskoAssets[_account][i] == _kreskoAsset) {
                break;
            }
        }
    }

    /**
     * @notice Gets the Kresko asset value in USD of a particular account.
     * @param _account The account to calculate the Kresko asset value for.
     * @return The Kresko asset value of a particular account.
     */
    function getAccountKrAssetValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(0);

        address[] memory assets = MinterStorage.state().mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            value = value.add(getKrAssetValue(asset, MinterStorage.state().kreskoAssetDebt[_account][asset], false));
        }
        return value;
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
    ) public view returns (FixedPoint.Unsigned memory) {
        KrAsset memory krAsset = MinterStorage.state().kreskoAssets[_kreskoAsset];

        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(krAsset.oracle.latestAnswer()));

        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(_amount).mul(oraclePrice);

        if (!_ignoreKFactor) {
            value = value.mul(krAsset.kFactor);
        }

        return value;
    }
}
