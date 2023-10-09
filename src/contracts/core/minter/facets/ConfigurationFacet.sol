// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {CError} from "common/CError.sol";
import {DiamondEvent} from "common/Events.sol";
import {CModifiers} from "common/Modifiers.sol";
import {Percents, Role} from "common/Constants.sol";
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
        if (ds().storageVersion > 3) {
            revert CError.ALREADY_INITIALIZED();
        }
        updateMinCollateralRatio(args.minCollateralRatio);
        updateLiquidationThreshold(args.liquidationThreshold);
        emit DiamondEvent.Initialized(msg.sender, ds().storageVersion++);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinCollateralRatio(uint32 _newMinCollateralRatio) public override onlyRole(Role.ADMIN) {
        if (_newMinCollateralRatio < Percents.HUNDRED) {
            revert CError.INVALID_MCR(_newMinCollateralRatio, Percents.HUNDRED);
        } else if (_newMinCollateralRatio < ms().liquidationThreshold) {
            revert CError.INVALID_MCR(_newMinCollateralRatio, ms().liquidationThreshold);
        }
        ms().minCollateralRatio = _newMinCollateralRatio;
        emit MEvent.MinimumCollateralizationRatioUpdated(_newMinCollateralRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationThreshold(uint32 _newThreshold) public override onlyRole(Role.ADMIN) {
        if (_newThreshold < Percents.HUNDRED) {
            revert CError.INVALID_LT(_newThreshold, Percents.HUNDRED);
        } else if (_newThreshold > ms().minCollateralRatio) {
            revert CError.INVALID_LT(_newThreshold, ms().minCollateralRatio);
        }
        ms().liquidationThreshold = _newThreshold;
        ms().maxLiquidationRatio = _newThreshold + Percents.ONE;
        emit MEvent.LiquidationThresholdUpdated(_newThreshold);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMaxLiquidationRatio(uint32 _newMaxLiquidationRatio) public onlyRole(Role.ADMIN) {
        if (_newMaxLiquidationRatio < ms().liquidationThreshold) {
            revert CError.INVALID_MLR(_newMaxLiquidationRatio, ms().liquidationThreshold);
        }
        ms().maxLiquidationRatio = _newMaxLiquidationRatio;

        emit MEvent.MaxLiquidationRatioUpdated(_newMaxLiquidationRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationIncentive(
        address _collateralAsset,
        uint16 _newLiqIncentive
    ) public isCollateral(_collateralAsset) onlyRole(Role.ADMIN) {
        if (_newLiqIncentive < Percents.HUNDRED) {
            revert CError.INVALID_LIQ_INCENTIVE(_collateralAsset, _newLiqIncentive, Percents.HUNDRED);
        } else if (_newLiqIncentive > Percents.MAX_LIQ_INCENTIVE) {
            revert CError.INVALID_LIQ_INCENTIVE(_collateralAsset, _newLiqIncentive, Percents.MAX_LIQ_INCENTIVE);
        }
        cs().assets[_collateralAsset].liqIncentive = _newLiqIncentive;
        emit MEvent.LiquidationIncentiveMultiplierUpdated(_collateralAsset, _newLiqIncentive);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralFactor(
        address _collateralAsset,
        uint16 _newFactor
    ) public isCollateral(_collateralAsset) onlyRole(Role.ADMIN) {
        if (_newFactor > Percents.HUNDRED) {
            revert CError.INVALID_CFACTOR(_collateralAsset, _newFactor, Percents.HUNDRED);
        }

        cs().assets[_collateralAsset].factor = _newFactor;
        emit MEvent.CFactorUpdated(_collateralAsset, _newFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateKFactor(address _kreskoAsset, uint16 _newFactor) public isKrAsset(_kreskoAsset) onlyRole(Role.ADMIN) {
        if (_newFactor < Percents.HUNDRED) {
            revert CError.INVALID_KFACTOR(_kreskoAsset, _newFactor, Percents.HUNDRED);
        }
        cs().assets[_kreskoAsset].kFactor = _newFactor;
        emit MEvent.KFactorUpdated(_kreskoAsset, _newFactor);
    }
}
