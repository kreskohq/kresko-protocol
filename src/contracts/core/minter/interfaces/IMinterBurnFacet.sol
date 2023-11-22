// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IMinterBurnFacet {
    /**
     * @notice Burns existing Kresko assets.
     * @notice Manager role is required if the caller is not the account being repaid to or the account repaying.
     * @param _account The address to burn kresko assets for
     * @param _krAsset The address of the Kresko asset.
     * @param _burnAmount The amount of the Kresko asset to be burned.
     * @param _mintedKreskoAssetIndex The index of the kresko asset in the user's minted assets array.
     * Only needed if burning all principal debt of a particular collateral asset.
     * @param _repayee Account to burn assets from,
     */
    function burnKreskoAsset(
        address _account,
        address _krAsset,
        uint256 _burnAmount,
        uint256 _mintedKreskoAssetIndex,
        address _repayee
    ) external;
}
