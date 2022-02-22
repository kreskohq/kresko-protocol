// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../libraries/FixedPoint.sol";
import "../flux/interfaces/AggregatorV2V3Interface.sol";

interface IKresko {
    struct CollateralAsset {
        FixedPoint.Unsigned factor;
        AggregatorV2V3Interface oracle;
        address underlyingRebasingToken;
        uint8 decimals;
        bool exists;
    }

    struct KrAsset {
        FixedPoint.Unsigned kFactor;
        AggregatorV2V3Interface oracle;
        bool exists;
        bool mintable;
    }

    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external;

    function depositRebasingCollateral(
        address _account,
        address _collateralAsset,
        uint256 _rebasingAmount
    ) external;

    function withdrawCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external;

    function withdrawRebasingCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external;

    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount
    ) external;

    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount,
        uint256 _mintedKreskoAssetIndex
    ) external;

    function collateralExists(address) external view returns (bool);

    function krAssetExists(address) external view returns (bool);

    function kreskoAssets(address) external returns (KrAsset memory);

    function collateralAssets(address) external returns (CollateralAsset memory);

    function getDepositedCollateralAssetIndex(address, address) external returns (uint256 i);

    function getMintedKreskoAssetsIndex(address, address) external returns (uint256 i);
}
