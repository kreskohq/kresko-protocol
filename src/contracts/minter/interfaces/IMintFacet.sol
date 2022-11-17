// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface IMintFacet {
    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount
    ) external;
}
