// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Action} from "../MinterTypes.sol";

interface IAccountState {
    function getMintedKreskoAssets(address _account) external view returns (address[] memory);

    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256);

    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getAccountCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getAccountMinimumCollateralValueAtRatio(address _account, FixedPoint.Unsigned memory _ratio)
        external
        view
        returns (FixedPoint.Unsigned memory);

    function getDepositedCollateralAssetIndex(address _account, address _collateralAsset)
        external
        view
        returns (uint256 i);

    function getDepositedCollateralAssets(address _account) external view returns (address[] memory);

    function getAccountCollateralRatio(address _account) external view returns (FixedPoint.Unsigned memory);

    function getCollateralRatiosFor(address[] memory _accounts) external view returns (FixedPoint.Unsigned[] memory);
}
