// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

interface ICollateralReceiver {
    function onUncheckedCollateralWithdraw(
        address _account,
        address _collateralAsset,
        uint _withdrawalAmount,
        uint _depositedCollateralAssetIndex,
        bytes memory _userData
    ) external returns (bytes memory);
}
