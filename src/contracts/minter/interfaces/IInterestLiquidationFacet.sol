// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

interface IInterestLiquidationFacet {
    function batchLiquidateInterest(address _account, address _collateralAssetToSeize) external;

    function liquidateInterest(address _account, address _repayKreskoAsset, address _collateralAssetToSeize) external;
}
