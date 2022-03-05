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

    function kreskoAssets(address) external view returns (KrAsset memory);

    function collateralAssets(address) external view returns (CollateralAsset memory);

    function getDepositedCollateralAssetIndex(address, address) external view returns (uint256 i);

    function getMintedKreskoAssetsIndex(address, address) external view returns (uint256 i);

    function getMintedKreskoAssets(address user) external view returns (address[] memory);

    function getDepositedCollateralAssets(address user) external view returns (address[] memory);

    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory);

    function calculateMaxLiquidatableValueForAssets(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) external view returns (FixedPoint.Unsigned memory);

    function minimumCollateralizationRatio() external view returns (FixedPoint.Unsigned memory);

    function kreskoAssetDebt(address, address) external view returns (uint256);

    function collateralDeposits(address, address) external view returns (uint256);

    function getMinimumCollateralValue(address _krAsset, uint256 _amount)
        external
        view
        returns (FixedPoint.Unsigned memory);

    function getAccountCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getAccountMinimumCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKfactor
    ) external view returns (FixedPoint.Unsigned memory);
}
