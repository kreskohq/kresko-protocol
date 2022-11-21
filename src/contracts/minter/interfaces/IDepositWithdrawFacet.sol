// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface IDepositWithdrawFacet {
    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external;

    function withdrawCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external;
}
