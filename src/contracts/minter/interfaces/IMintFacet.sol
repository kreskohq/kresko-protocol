// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;

interface IMintFacet {
    function mintKreskoAsset(address _account, address _kreskoAsset, uint256 _amount) external;
}
