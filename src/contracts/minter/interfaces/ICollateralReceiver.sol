// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface ICollateralReceiver {
    function onUncheckedCollateralWithdraw(
        address account,
        address collateralAsset,
        uint withdrawalAmount,
        uint depositAmount
    ) external;
}
