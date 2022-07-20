// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {CollateralAsset, KrAsset} from "../MinterTypes.sol";

interface IState {
    function domainSeparator() external view returns (bytes32);

    function minterInitializations() external view returns (uint256);

    function burnFee() external view returns (FixedPoint.Unsigned memory);

    function feeRecipient() external view returns (address);

    function liquidationIncentiveMultiplier() external view returns (FixedPoint.Unsigned memory);

    function minimumCollateralizationRatio() external view returns (FixedPoint.Unsigned memory);

    function minimumDebtValue() external view returns (FixedPoint.Unsigned memory);

    function krAssetExists(address _krAsset) external view returns (bool);

    function kreskoAsset(address _asset) external view returns (KrAsset memory);

    function collateralAsset(address _asset) external view returns (CollateralAsset memory);

    function collateralExists(address _collateralAsset) external view returns (bool);

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
