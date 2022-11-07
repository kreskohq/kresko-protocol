// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface IKreskoAssetFacet {
    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount,
        uint256 _mintedKreskoAssetIndex
    ) external;

    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount
    ) external;
}
