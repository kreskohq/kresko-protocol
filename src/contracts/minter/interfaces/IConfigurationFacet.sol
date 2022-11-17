// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {MinterInitArgs, KrAsset, CollateralAsset} from "../MinterTypes.sol";

interface IConfigurationFacet {
    function initialize(MinterInitArgs calldata args) external;

    function addCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        address _oracle
    ) external;

    function addKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _oracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external;

    function updateCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        address _oracle
    ) external;

    function updateFeeRecipient(address _feeRecipient) external;

    function updateKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _oracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external;

    function updateLiquidationIncentiveMultiplier(uint256 _liquidationIncentiveMultiplier) external;

    function updateMinimumCollateralizationRatio(uint256 _minimumCollateralizationRatio) external;

    function updateMinimumDebtValue(uint256 _minimumDebtValue) external;

    function updateLiquidationThreshold(uint256 _minimumDebtValue) external;

    function updateAMMOracle(address _ammOracle) external;

    function updateExtOracleDecimals(uint8 _decimals) external;
}
