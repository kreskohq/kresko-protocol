// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../../shared/FP.sol" as FixedPoint;
import {Action} from "../state/Structs.sol";

interface IAssetViewFacet {
    function getMintedKreskoAssets(address _account) external view returns (address[] memory);

    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256);

    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) external view returns (FixedPoint.Unsigned memory);

    function collateralExists(address _collateralAsset) external view returns (bool);

    function getAccountCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getAccountMinimumCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory);

    function getDepositedCollateralAssetIndex(address _account, address _collateralAsset)
        external
        view
        returns (uint256 i);

    function getDepositedCollateralAssets(address _account) external view returns (address[] memory);

    function getCollateralRatiosFor(address[] memory _accounts) external view returns (FixedPoint.Unsigned[] memory);

    function assetActionPaused(Action _action, address _asset) external view returns (bool);
}
