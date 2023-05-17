// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;

import {MinterInitArgs, KrAsset, CollateralAsset} from "../MinterTypes.sol";

interface IConfigurationFacet {
    function initialize(MinterInitArgs calldata args) external;

    /**
     * @notice Adds a collateral asset to the protocol.
     * @dev Only callable by the owner and cannot be called more than once for an asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _anchor Underlying anchor for a krAsset collateral, needs to support IKreskoAssetAnchor.
     * @param _factor The collateral factor of the collateral asset.
     * Must be <= 1e18.
     * @param _liquidationIncentiveMultiplier The liquidation incentive multiplier.
     * @param _priceFeedOracle The oracle address for the collateral asset's USD value.
     * @param _marketStatusOracle The oracle address for the collateral asset's market open/closed status
     */
    function addCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        uint256 _liquidationIncentiveMultiplier,
        address _priceFeedOracle,
        address _marketStatusOracle
    ) external;

    /**
     * @notice Adds a KreskoAsset to the protocol.
     * @dev Only callable by the owner.
     * @param _krAsset The address of the wrapped KreskoAsset, needs to support IKreskoAsset.
     * @param _anchor Underlying anchor for the krAsset, needs to support IKreskoAssetAnchor.
     * @param _kFactor The k-factor of the KreskoAsset. Must be >= 1e18.
     * @param _priceFeedOracle The oracle address for the KreskoAsset.
     * @param _marketStatusOracle The oracle address for the KreskoAsset market status.
     * @param _supplyLimit The initial total supply limit for the KreskoAsset.
     * @param _closeFee The initial close fee percentage for the KreskoAsset.
     * @param _openFee The initial open fee percentage for the KreskoAsset.
     */
    function addKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _priceFeedOracle,
        address _marketStatusOracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external;

    /**
     * @notice Updates a previously added collateral asset.
     * @dev Only callable by the owner.
     * @param _collateralAsset The address of the collateral asset.
     * @param _anchor Underlying anchor for a krAsset collateral, needs to support IKreskoAssetAnchor.
     * @param _factor The new collateral factor. Must be <= 1e18.
     * @param _liquidationIncentiveMultiplier The liquidation incentive multiplier.
     * @param _priceFeedOracle The new oracle address for the collateral asset.
     * @param _marketStatusOracle The oracle address for the collateral asset's market open/closed status
     */
    function updateCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        uint256 _liquidationIncentiveMultiplier,
        address _priceFeedOracle,
        address _marketStatusOracle
    ) external;

    /**
     * @notice Updates the fee recipient.
     * @param _feeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _feeRecipient) external;

    /**
     * @notice  Updates the cFactor of a KreskoAsset.
     * @param _collateralAsset The collateral asset.
     * @param _cFactor The new cFactor.
     */
    function updateCFactor(address _collateralAsset, uint256 _cFactor) external;

    /**
     * @notice Updates the kFactor of a KreskoAsset.
     * @param _kreskoAsset The KreskoAsset.
     * @param _kFactor The new kFactor.
     */
    function updateKFactor(address _kreskoAsset, uint256 _kFactor) external;

    /**
     * @notice Updates the k-factor of a previously added KreskoAsset.
     * @dev Only callable by the owner.
     * @param _krAsset The address of the KreskoAsset.
     * @param _anchor Underlying anchor for a krAsset.
     * @param _kFactor The new k-factor. Must be >= 1e18.
     * @param _priceFeedOracle The new oracle address for the KreskoAsset's USD value.
     * @param _marketStatusOracle The oracle address for the KreskoAsset market status.
     * @param _supplyLimit The new total supply limit for the KreskoAsset.
     * @param _closeFee The new close fee percentage for the KreskoAsset.
     * @param _openFee The new open fee percentage for the KreskoAsset.
     */
    function updateKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _priceFeedOracle,
        address _marketStatusOracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external;

    /**
     * @notice Updates the liquidation incentive multiplier.
     * @param _collateralAsset The collateral asset to update it for.
     * @param _liquidationIncentiveMultiplier The new liquidation incentive multiplie.
     */
    function updateLiquidationIncentiveMultiplier(
        address _collateralAsset,
        uint256 _liquidationIncentiveMultiplier
    ) external;

    /**
     * @notice Updates the max liquidation usd overflow multiplier value.
     * @param _maxLiquidationMultiplier Overflow value in percent, 18 decimals.
     */
    function updateMaxLiquidationMultiplier(uint256 _maxLiquidationMultiplier) external;

    /**
     * @dev Updates the contract's collateralization ratio.
     * @param _minimumCollateralizationRatio The new minimum collateralization ratio as wad.
     */
    function updateMinimumCollateralizationRatio(uint256 _minimumCollateralizationRatio) external;

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _minimumDebtValue The new minimum debt value as a wad.
     */
    function updateMinimumDebtValue(uint256 _minimumDebtValue) external;

    /**
     * @dev Updates the contract's liquidation threshold value
     * @param _liquidationThreshold The new liquidation threshold value
     */
    function updateLiquidationThreshold(uint256 _liquidationThreshold) external;

    /**
     * @notice Sets the protocol AMM oracle address
     * @param _ammOracle  The address of the oracle
     */
    function updateAMMOracle(address _ammOracle) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _decimals Amount of decimals
     */
    function updateExtOracleDecimals(uint8 _decimals) external;
}
