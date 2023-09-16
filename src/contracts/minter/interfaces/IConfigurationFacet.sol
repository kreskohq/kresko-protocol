// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {MinterInitArgs, KrAsset, CollateralAsset} from "../Types.sol";

interface IConfigurationFacet {
    function initializeMinter(MinterInitArgs calldata args) external;

    /**
     * @notice Updates the fee recipient.
     * @param _newFeeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _newFeeRecipient) external;

    /**
     * @notice Updates the liquidation incentive multiplier.
     * @param _collateralAsset The collateral asset to update.
     * @param _newLiquidationIncentive The new liquidation incentive multiplier for the asset.
     */
    function updateLiquidationIncentiveOf(address _collateralAsset, uint256 _newLiquidationIncentive) external;

    /**
     * @notice  Updates the cFactor of a KreskoAsset.
     * @param _collateralAsset The collateral asset.
     * @param _newFactor The new collateral factor.
     */
    function updateCollateralFactor(address _collateralAsset, uint256 _newFactor) external;

    /**
     * @notice Updates the kFactor of a KreskoAsset.
     * @param _kreskoAsset The KreskoAsset.
     * @param _kFactor The new kFactor.
     */
    function updateKFactor(address _kreskoAsset, uint256 _kFactor) external;

    /**
     * @dev Updates the contract's collateralization ratio.
     * @param _newMinCollateralRatio The new minimum collateralization ratio as wad.
     */
    function updateMinCollateralRatio(uint256 _newMinCollateralRatio) external;

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _newMinDebtValue The new minimum debt value as a wad.
     */
    function updateMinDebtValue(uint256 _newMinDebtValue) external;

    /**
     * @dev Updates the contract's liquidation threshold value
     * @param _newThreshold The new liquidation threshold value
     */
    function updateLiquidationThreshold(uint256 _newThreshold) external;

    /**
     * @notice Updates the max liquidation usd overflow multiplier value.
     * @param _maxLiquidationMultiplier Overflow value in percent, 18 decimals.
     */
    function updateMaxLiquidationMultiplier(uint256 _maxLiquidationMultiplier) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _decimals Amount of decimals
     */
    function updateExtOracleDecimals(uint8 _decimals) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _oracleDeviationPct Amount of decimals
     */
    function updateOracleDeviationPct(uint256 _oracleDeviationPct) external;

    /**
     * @notice Sets L2 sequencer uptime feed address
     * @param _sequencerUptimeFeed sequencer uptime feed address
     */
    function updateSequencerUptimeFeed(address _sequencerUptimeFeed) external;

    /**
     * @notice Sets sequencer grace period time
     * @param _sequencerGracePeriodTime grace period time
     */
    function updateSequencerGracePeriodTime(uint256 _sequencerGracePeriodTime) external;

    /**
     * @notice Sets oracle timeout
     * @param _oracleTimeout oracle timeout in seconds
     */
    function updateOracleTimeout(uint256 _oracleTimeout) external;

    /**
     * @notice Adds a collateral asset to the protocol.
     * @dev Only callable by the owner and cannot be called more than once for an asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _config The configuration for the collateral asset.
     */
    function addCollateralAsset(address _collateralAsset, CollateralAsset memory _config) external;

    /**
     * @notice Adds a KreskoAsset to the protocol.
     * @dev Only callable by the owner.
     * @param _krAsset The address of the wrapped KreskoAsset, needs to support IKreskoAsset.
     * @param _config Configuration for the KreskoAsset.
     */
    function addKreskoAsset(address _krAsset, KrAsset memory _config) external;

    /**
     * @notice Updates a previously added collateral asset.
     * @dev Only callable by the owner.
     * @param _collateralAsset The address of the collateral asset.
     * @param _config The configuration for the collateral asset.
     */
    function updateCollateralAsset(address _collateralAsset, CollateralAsset memory _config) external;

    /**
     * @notice Updates a previously added kresko asset.
     * @dev Only callable by the owner.
     * @param _krAsset The address of the KreskoAsset.
     * @param _config Configuration for the KreskoAsset.
     */
    function updateKreskoAsset(address _krAsset, KrAsset memory _config) external;
}
