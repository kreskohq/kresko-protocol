// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {Errors} from "common/Errors.sol";
import {Modifiers} from "common/Modifiers.sol";
import {Percents, Role} from "common/Constants.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {Validations} from "common/Validations.sol";

import {DSModifiers} from "diamond/DSModifiers.sol";

import {IMinterConfigFacet} from "minter/interfaces/IMinterConfigFacet.sol";
import {MEvent} from "minter/MEvent.sol";
import {ms} from "minter/MState.sol";
import {MinterInitArgs} from "minter/MTypes.sol";

/**
 * @author Kresko
 * @title MinterConfigFacet
 * @notice Functionality for `Role.ADMIN` level actions.
 * @notice Can be only initialized by the deployer/owner.
 */
contract MinterConfigFacet is DSModifiers, Modifiers, IMinterConfigFacet {
    /* -------------------------------------------------------------------------- */
    /*                                 Initialize                                 */
    /* -------------------------------------------------------------------------- */

    function initializeMinter(MinterInitArgs calldata args) external initializer(3) initializeAsAdmin {
        setMinCollateralRatioMinter(args.minCollateralRatio);
        setLiquidationThresholdMinter(args.liquidationThreshold);
        setMinDebtValueMinter(args.minDebtValue);
    }

    /// @inheritdoc IMinterConfigFacet
    function setMinDebtValueMinter(uint256 _newMinDebtValue) public override onlyRole(Role.ADMIN) {
        Validations.validateMinDebtValue(_newMinDebtValue);
        emit MEvent.MinimumDebtValueUpdated(ms().minDebtValue, _newMinDebtValue);
        ms().minDebtValue = _newMinDebtValue;
    }

    /// @inheritdoc IMinterConfigFacet
    function setMinCollateralRatioMinter(uint32 _newMinCollateralRatio) public override onlyRole(Role.ADMIN) {
        Validations.validateMinCollateralRatio(_newMinCollateralRatio, ms().liquidationThreshold);
        emit MEvent.MinCollateralRatioUpdated(ms().minCollateralRatio, _newMinCollateralRatio);
        ms().minCollateralRatio = _newMinCollateralRatio;
    }

    /// @inheritdoc IMinterConfigFacet
    function setLiquidationThresholdMinter(uint32 _newLT) public override onlyRole(Role.ADMIN) {
        Validations.validateLiquidationThreshold(_newLT, ms().minCollateralRatio);

        uint32 newMLR = _newLT + Percents.ONE;

        emit MEvent.LiquidationThresholdUpdated(ms().liquidationThreshold, _newLT, newMLR);
        emit MEvent.MaxLiquidationRatioUpdated(ms().maxLiquidationRatio, newMLR);

        ms().liquidationThreshold = _newLT;
        ms().maxLiquidationRatio = newMLR;
    }

    /// @inheritdoc IMinterConfigFacet
    function setMaxLiquidationRatioMinter(uint32 _newMaxLiquidationRatio) public onlyRole(Role.ADMIN) {
        Validations.validateMaxLiquidationRatio(_newMaxLiquidationRatio, ms().liquidationThreshold);
        emit MEvent.MaxLiquidationRatioUpdated(ms().maxLiquidationRatio, _newMaxLiquidationRatio);
        ms().maxLiquidationRatio = _newMaxLiquidationRatio;
    }

    /// @inheritdoc IMinterConfigFacet
    function setCollateralLiquidationIncentiveMinter(
        address _collateralAsset,
        uint16 _newLiqIncentive
    ) public onlyRole(Role.ADMIN) {
        Asset storage asset = cs().onlyMinterCollateral(_collateralAsset);
        Validations.validateLiqIncentive(_collateralAsset, _newLiqIncentive);

        if (_newLiqIncentive < Percents.HUNDRED || _newLiqIncentive > Percents.MAX_LIQ_INCENTIVE) {
            revert Errors.INVALID_LIQ_INCENTIVE(
                Errors.id(_collateralAsset),
                _newLiqIncentive,
                Percents.HUNDRED,
                Percents.MAX_LIQ_INCENTIVE
            );
        }
        emit MEvent.LiquidationIncentiveUpdated(
            MEvent.symbol(_collateralAsset),
            _collateralAsset,
            asset.liqIncentive,
            _newLiqIncentive
        );
        asset.liqIncentive = _newLiqIncentive;
    }
}
