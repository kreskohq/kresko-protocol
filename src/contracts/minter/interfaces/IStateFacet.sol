// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {CollateralAsset, KrAsset, MinterParams} from "../MinterTypes.sol";

interface IStateFacet {
    function domainSeparator() external view returns (bytes32);

    function minterInitializations() external view returns (uint256);

    function feeRecipient() external view returns (address);

    function ammOracle() external view returns (address);

    function extOracleDecimals() external view returns (uint8);

    function liquidationThreshold() external view returns (FixedPoint.Unsigned memory);

    function liquidationIncentiveMultiplier() external view returns (FixedPoint.Unsigned memory);

    function minimumCollateralizationRatio() external view returns (FixedPoint.Unsigned memory);

    function minimumDebtValue() external view returns (FixedPoint.Unsigned memory);

    function krAssetExists(address _krAsset) external view returns (bool);

    function kreskoAsset(address _asset) external view returns (KrAsset memory);

    function collateralAsset(address _asset) external view returns (CollateralAsset memory);

    function collateralExists(address _collateralAsset) external view returns (bool);

    function getAllParams() external view returns (MinterParams memory);

    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory);

    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) external view returns (FixedPoint.Unsigned memory);
}
