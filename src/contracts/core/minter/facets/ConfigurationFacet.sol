// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Role} from "common/Types.sol";
import {Error} from "common/Errors.sol";
import {DiamondEvent} from "common/Events.sol";
import {CModifiers} from "common/Modifiers.sol";
import {Constants} from "common/Constants.sol";
import {cs} from "common/State.sol";

import {DSModifiers} from "diamond/Modifiers.sol";
import {ds} from "diamond/State.sol";

import {IConfigurationFacet} from "minter/interfaces/IConfigurationFacet.sol";
import {MEvent} from "minter/Events.sol";
import {ms} from "minter/State.sol";
import {MinterInitArgs} from "minter/Types.sol";

/**
 * @author Kresko
 * @title ConfigurationFacet
 * @notice Functionality for `Role.ADMIN` level actions.
 * @notice Can be only initialized by the deployer/owner.
 */
contract ConfigurationFacet is DSModifiers, CModifiers, IConfigurationFacet {
    /* -------------------------------------------------------------------------- */
    /*                                 Initialize                                 */
    /* -------------------------------------------------------------------------- */

    function initializeMinter(MinterInitArgs calldata args) external onlyOwner {
        updateMinCollateralRatio(args.minCollateralRatio);
        updateLiquidationThreshold(args.liquidationThreshold);
        emit DiamondEvent.Initialized(msg.sender, ds().storageVersion++);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinCollateralRatio(uint256 _newMinCollateralRatio) public override onlyRole(Role.ADMIN) {
        require(_newMinCollateralRatio >= Constants.MIN_COLLATERALIZATION_RATIO, Error.PARAM_MIN_COLLATERAL_RATIO_LOW);
        require(_newMinCollateralRatio >= ms().liquidationThreshold, Error.PARAM_COLLATERAL_RATIO_LOW_THAN_LT);
        ms().minCollateralRatio = _newMinCollateralRatio;
        emit MEvent.MinimumCollateralizationRatioUpdated(_newMinCollateralRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationThreshold(uint256 _newThreshold) public override onlyRole(Role.ADMIN) {
        require(_newThreshold >= Constants.MIN_COLLATERALIZATION_RATIO, "lt-too-low");
        require(_newThreshold <= ms().minCollateralRatio, Error.INVALID_LT);
        ms().liquidationThreshold = _newThreshold;
        ms().maxLiquidationRatio = _newThreshold + Constants.ONE_PERCENT;
        emit MEvent.LiquidationThresholdUpdated(_newThreshold);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMaxLiquidationRatio(uint256 _newMaxLiquidationRatio) public override onlyRole(Role.ADMIN) {
        require(_newMaxLiquidationRatio >= ms().liquidationThreshold, Error.PARAM_LIQUIDATION_OVERFLOW_LOW);
        ms().maxLiquidationRatio = _newMaxLiquidationRatio;

        emit MEvent.MaxLiquidationRatioUpdated(_newMaxLiquidationRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationIncentive(
        address _collateralAsset,
        uint256 _newLiquidationIncentive
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(
            _newLiquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _newLiquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );

        cs().assets[_collateralAsset].liquidationIncentive = _newLiquidationIncentive;
        emit MEvent.LiquidationIncentiveMultiplierUpdated(_collateralAsset, _newLiquidationIncentive);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralFactor(
        address _collateralAsset,
        uint256 _newFactor
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(_newFactor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        cs().assets[_collateralAsset].factor = _newFactor;
        emit MEvent.CFactorUpdated(_collateralAsset, _newFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateKFactor(
        address _kreskoAsset,
        uint256 _newFactor
    ) public override kreskoAssetExists(_kreskoAsset) onlyRole(Role.ADMIN) {
        require(_newFactor >= Constants.ONE_HUNDRED_PERCENT, Error.KRASSET_INVALID_FACTOR);
        cs().assets[_kreskoAsset].kFactor = _newFactor;
        emit MEvent.KFactorUpdated(_kreskoAsset, _newFactor);
    }
}
