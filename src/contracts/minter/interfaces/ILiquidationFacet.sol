// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../../shared/FixedPoint.sol";

interface ILiquidationFacet {
    function calculateMaxLiquidatableValueForAssets(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) external view returns (FixedPoint.Unsigned memory maxLiquidatableUSD);

    function isAccountLiquidatable(address _account) external view returns (bool);

    function liquidate(
        address _account,
        address _repayKreskoAsset,
        uint256 _repayAmount,
        address _collateralAssetToSeize,
        uint256 _mintedKreskoAssetIndex,
        uint256 _depositedCollateralAssetIndex
    ) external;
}
