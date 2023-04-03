// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Action} from "../MinterTypes.sol";

interface IAccountStateFacet {
    function getMintedKreskoAssets(address _account) external view returns (address[] memory);

    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256);

    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function kreskoAssetDebt(address _account, address _asset) external view returns (uint256);

    function kreskoAssetDebtPrincipal(address _account, address _asset) external view returns (uint256);

    function kreskoAssetDebtInterest(
        address _account,
        address _asset
    ) external view returns (uint256 assetAmount, uint256 kissAmount);

    function getAccountCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getAccountMinimumCollateralValueAtRatio(
        address _account,
        FixedPoint.Unsigned memory _ratio
    ) external view returns (FixedPoint.Unsigned memory);

    function getAccountCollateralRatio(address _account) external view returns (FixedPoint.Unsigned memory ratio);

    function getCollateralRatiosFor(address[] memory _accounts) external view returns (FixedPoint.Unsigned[] memory);

    function getAccountSingleCollateralValueAndRealValue(
        address _account,
        address _asset
    ) external view returns (FixedPoint.Unsigned memory value, FixedPoint.Unsigned memory realValue);

    function getDepositedCollateralAssetIndex(
        address _account,
        address _collateralAsset
    ) external view returns (uint256 i);

    function getDepositedCollateralAssets(address _account) external view returns (address[] memory);

    function collateralDeposits(address _account, address _asset) external view returns (uint256);

    function calcExpectedFee(
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmount,
        uint256 _feeType
    ) external view returns (address[] memory, uint256[] memory);
}
