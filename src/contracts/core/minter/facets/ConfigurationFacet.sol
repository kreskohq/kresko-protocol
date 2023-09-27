// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Role} from "common/Types.sol";
import {CError} from "common/Errors.sol";
import {DiamondEvent} from "common/Events.sol";
import {CModifiers} from "common/Modifiers.sol";
import {Percents} from "common/Constants.sol";
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
    function updateMinCollateralRatio(uint32 _newMinCollateralRatio) public override onlyRole(Role.ADMIN) {
        if (_newMinCollateralRatio < Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_MCR(_newMinCollateralRatio);
        } else if (_newMinCollateralRatio < ms().liquidationThreshold) {
            revert CError.INVALID_MCR(_newMinCollateralRatio);
        }
        ms().minCollateralRatio = _newMinCollateralRatio;
        emit MEvent.MinimumCollateralizationRatioUpdated(_newMinCollateralRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationThreshold(uint32 _newThreshold) public override onlyRole(Role.ADMIN) {
        if (_newThreshold < Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_LT(_newThreshold);
        } else if (_newThreshold > ms().minCollateralRatio) {
            revert CError.INVALID_LT(_newThreshold);
        }
        ms().liquidationThreshold = _newThreshold;
        ms().maxLiquidationRatio = _newThreshold + Percents.ONE_PERCENT;
        emit MEvent.LiquidationThresholdUpdated(_newThreshold);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMaxLiquidationRatio(uint32 _newMaxLiquidationRatio) public override onlyRole(Role.ADMIN) {
        if (_newMaxLiquidationRatio < ms().liquidationThreshold) {
            revert CError.INVALID_MLR(_newMaxLiquidationRatio);
        }
        ms().maxLiquidationRatio = _newMaxLiquidationRatio;

        emit MEvent.MaxLiquidationRatioUpdated(_newMaxLiquidationRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationIncentive(
        address _collateralAsset,
        uint16 _newLiquidationIncentive
    ) public override collateralExists(_collateralAsset) onlyRole(Role.ADMIN) {
        if (_newLiquidationIncentive < Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_LIQUIDATION_INCENTIVE(_newLiquidationIncentive);
        } else if (_newLiquidationIncentive > Percents.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER) {
            revert CError.INVALID_LIQUIDATION_INCENTIVE(_newLiquidationIncentive);
        }
        cs().assets[_collateralAsset].liquidationIncentive = _newLiquidationIncentive;
        emit MEvent.LiquidationIncentiveMultiplierUpdated(_collateralAsset, _newLiquidationIncentive);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralFactor(
        address _collateralAsset,
        uint16 _newFactor
    ) public override collateralExists(_collateralAsset) onlyRole(Role.ADMIN) {
        if (_newFactor > Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_FACTOR(_newFactor);
        }

        cs().assets[_collateralAsset].factor = _newFactor;
        emit MEvent.CFactorUpdated(_collateralAsset, _newFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateKFactor(
        address _kreskoAsset,
        uint16 _newFactor
    ) public override kreskoAssetExists(_kreskoAsset) onlyRole(Role.ADMIN) {
        if (_newFactor < Percents.ONE_HUNDRED_PERCENT) {
            revert CError.INVALID_FACTOR(_newFactor);
        }
        cs().assets[_kreskoAsset].kFactor = _newFactor;
        emit MEvent.KFactorUpdated(_kreskoAsset, _newFactor);
    }
}
