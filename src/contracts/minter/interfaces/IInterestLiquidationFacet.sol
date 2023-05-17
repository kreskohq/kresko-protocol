// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.14;

interface IInterestLiquidationFacet {
    function batchLiquidateInterest(address _account, address _collateralAssetToSeize) external;

    function liquidateInterest(address _account, address _repayKreskoAsset, address _collateralAssetToSeize) external;
}
