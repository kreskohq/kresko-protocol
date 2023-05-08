// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface ICollateralReceiver {
    function onUncheckedCollateralWithdraw(
        address _account,
        address _collateralAsset,
        uint _withdrawalAmount,
        uint _depositAmount,
        bytes memory _userData
    ) external returns (bytes memory);
}
