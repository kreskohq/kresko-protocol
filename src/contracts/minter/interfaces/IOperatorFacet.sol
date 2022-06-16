// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {IAssetViewFacet} from "../interfaces/IAssetViewFacet.sol";
import {ILiquidationFacet} from "../interfaces/ILiquidationFacet.sol";
import {ISafetyCouncilFacet} from "../interfaces/ISafetyCouncilFacet.sol";
import {IUserFacet} from "../interfaces/IUserFacet.sol";
import {IKreskoAsset} from "../interfaces/IKreskoAsset.sol";
import {INonRebasingWrapperToken} from "../interfaces/INonRebasingWrapperToken.sol";

import {MinterInitArgs, KrAsset, CollateralAsset, AggregatorV2V3Interface} from "../state/Structs.sol";

interface IOperatorFacet {
    function addCollateralAsset(
        address _collateralAsset,
        uint256 _factor,
        address _oracle,
        bool isNonRebasingWrapperToken
    ) external;

    function addKreskoAsset(
        address _kreskoAsset,
        string calldata _symbol,
        uint256 _kFactor,
        address _oracle,
        uint256 _marketCapUSDLimit
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
        address _kreskoAsset,
        uint256 _kFactor,
        address _oracle,
        bool _mintable,
        uint256 _marketCapUSDLimit
    ) external;

    function updateLiquidationIncentiveMultiplier(uint256 _liquidationIncentiveMultiplier) external;

    function updateMinimumCollateralizationRatio(uint256 _minimumCollateralizationRatio) external;

    function updateMinimumDebtValue(uint256 _minimumDebtValue) external;

    function updateSecondsUntilStalePrice(uint256 _secondsUntilStalePrice) external;
}
