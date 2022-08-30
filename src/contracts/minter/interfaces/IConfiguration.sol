// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {MinterInitArgs, KrAsset, CollateralAsset} from "../MinterTypes.sol";

interface IConfiguration {
    function addCollateralAsset(
        address _collateralAsset,
        uint256 _factor,
        address _oracle
    ) external;

    function addKreskoAsset(
        address _krAsset,
        uint256 _kFactor,
        address _oracle,
        uint256 _supplyLimit
    ) external;

    function initialize(MinterInitArgs calldata args) external;

    function updateBurnFee(uint256 _burnFee) external;

    function updateCollateralAsset(
        address _collateralAsset,
        uint256 _factor,
        address _oracle
    ) external;

    function updateFeeRecipient(address _feeRecipient) external;

    function updateKreskoAsset(
        address _krAsset,
        uint256 _kFactor,
        address _oracle,
        bool _mintable,
        uint256 _supplyLimit
    ) external;

    function updateLiquidationIncentiveMultiplier(uint256 _liquidationIncentiveMultiplier) external;

    function updateMinimumCollateralizationRatio(uint256 _minimumCollateralizationRatio) external;

    function updateMinimumDebtValue(uint256 _minimumDebtValue) external;

    function updateLiquidationThreshold(uint256 _minimumDebtValue) external;
}