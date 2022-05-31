// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
import "../../libraries/FixedPoint.sol";

interface IKresko {
    /**
     * @notice Information on a token that is a Kresko asset.
     * @dev Each Kresko asset has 18 decimals.
     * @param kFactor The k-factor used for calculating the required collateral value for Kresko asset debt.
     * @param oracle The oracle that provides the USD price of one Kresko asset.
     * @param exists Whether the Kresko asset exists within the protocol.
     * @param mintable Whether the Kresko asset can be minted.
     */
    struct KrAsset {
        FixedPoint.Unsigned kFactor;
        address oracle;
        bool exists;
        bool mintable;
    }

    struct CollateralAsset {
        FixedPoint.Unsigned factor;
        address oracle;
        address underlyingRebasingToken;
        uint8 decimals;
        bool exists;
    }

    function getMintedKreskoAssets(address user) external view returns (address[] memory);

    function getDepositedCollateralAssets(address user) external view returns (address[] memory);

    function isAccountLiquidatable(address user) external view returns (bool);

    function liquidate(
        address _account,
        address _repayKreskoAsset,
        uint256 _repayAmount,
        address _collateralAssetToSeize,
        uint256 _mintedKreskoAssetIndex,
        uint256 _depositedCollateralAssetIndex,
        bool _keepKrAssetDebt
    ) external;

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

    function depositCollateral(
        address to,
        address _collateralAsset,
        uint256 _amount
    ) external;

    function mintKreskoAsset(
        address to,
        address _kreskoAsset,
        uint256 _amount
    ) external;

    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKfactor
    ) external view returns (FixedPoint.Unsigned memory);

    function kreskoAssets(address _kreskoAsset) external view returns (KrAsset memory);

    function collateralAssets(address _collateralAsset) external view returns (CollateralAsset memory);

    function withdrawCollateral(
        address from,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external;

    function kreskoAssetDebt(address, address) external view returns (uint256);

    function collateralDeposits(address, address) external view returns (uint256);

    function getAccountMinimumCollateralValue(address _account) external view returns (FixedPoint.Unsigned memory);

    function getMinimumCollateralValue(address _krAsset, uint256 _amount)
        external
        view
        returns (FixedPoint.Unsigned memory);

    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256 i);

    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory);
}
