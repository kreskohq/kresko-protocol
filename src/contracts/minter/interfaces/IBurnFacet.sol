// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.14;

interface IBurnFacet {
    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount,
        uint256 _mintedKreskoAssetIndex
    ) external;
}
