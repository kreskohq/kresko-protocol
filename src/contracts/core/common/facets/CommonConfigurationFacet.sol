// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {CModifiers} from "common/Modifiers.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {DiamondEvent} from "common/Events.sol";

import {Constants} from "common/Constants.sol";
import {CommonInitArgs, Role, NOT_ENTERED} from "common/Types.sol";
import {ICommonConfigurationFacet} from "common/interfaces/ICommonConfigurationFacet.sol";
import {IAuthorizationFacet} from "common/interfaces/IAuthorizationFacet.sol";
import {CError, Error} from "common/Errors.sol";
import {cs, gs} from "common/State.sol";
import {Auth} from "common/Auth.sol";

import {MEvent} from "minter/Events.sol";
import {ds} from "diamond/State.sol";

contract CommonConfigurationFacet is ICommonConfigurationFacet, CModifiers, DSModifiers {
    function initializeCommon(CommonInitArgs memory args) external onlyOwner {
        if (ds().storageVersion != 1) {
            revert(Error.ALREADY_INITIALIZED);
        }
        cs().entered = NOT_ENTERED;
        // Temporarily set ADMIN role for deployer
        Auth._grantRole(Role.DEFAULT_ADMIN, msg.sender);
        Auth._grantRole(Role.ADMIN, msg.sender);

        // Grant the admin role to admin
        Auth._grantRole(Role.DEFAULT_ADMIN, args.admin);
        Auth._grantRole(Role.ADMIN, args.admin);

        /**
         * @notice Council can be set only by this specific function.
         * Requirements:
         *
         * - address `_council` must implement ERC165 and a specific multisig interfaceId.
         * - reverts if above is not true.
         */
        Auth.setupSecurityCouncil(args.council);

        updateFeeRecipient(args.treasury);
        updateMinDebtValue(args.minDebtValue);
        updateExtOracleDecimals(args.extOracleDecimals);
        updateSequencerUptimeFeed(args.sequencerUptimeFeed);
        updateOracleDeviationPct(args.oracleDeviationPct);
        updateSequencerGracePeriodTime(args.sequencerGracePeriodTime);
        updateOracleTimeout(args.oracleTimeout);
        updatePhase(args.phase);
        updateKreskian(args.kreskian);
        updateQuestForKresk(args.questForKresk);

        ds().supportedInterfaces[type(IAuthorizationFacet).interfaceId] = true;

        emit DiamondEvent.Initialized(msg.sender, ds().storageVersion++);
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateMinDebtValue(uint64 _newMinDebtValue) public override onlyRole(Role.ADMIN) {
        if (_newMinDebtValue > Constants.MAX_MIN_DEBT_VALUE) {
            revert CError.INVALID_MIN_DEBT(_newMinDebtValue);
        }
        cs().minDebtValue = _newMinDebtValue;

        emit MEvent.MinimumDebtValueUpdated(_newMinDebtValue);
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateFeeRecipient(address _newFeeRecipient) public override onlyRole(Role.ADMIN) {
        if (_newFeeRecipient == address(0)) {
            revert CError.INVALID_FEE_RECIPIENT(_newFeeRecipient);
        }

        cs().feeRecipient = _newFeeRecipient;
        emit MEvent.FeeRecipientUpdated(_newFeeRecipient);
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateExtOracleDecimals(uint8 _decimals) public onlyRole(Role.ADMIN) {
        cs().extOracleDecimals = _decimals;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateOracleDeviationPct(uint16 _oracleDeviationPct) public onlyRole(Role.ADMIN) {
        if (_oracleDeviationPct > 1e4) {
            revert CError.INVALID_ORACLE_DEVIATION(_oracleDeviationPct);
        }
        cs().oracleDeviationPct = _oracleDeviationPct;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateSequencerUptimeFeed(address _sequencerUptimeFeed) public override onlyRole(Role.ADMIN) {
        cs().sequencerUptimeFeed = _sequencerUptimeFeed;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateSequencerGracePeriodTime(uint24 _sequencerGracePeriodTime) public onlyRole(Role.ADMIN) {
        cs().sequencerGracePeriodTime = _sequencerGracePeriodTime;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateOracleTimeout(uint32 _oracleTimeout) public onlyRole(Role.ADMIN) {
        cs().oracleTimeout = _oracleTimeout;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updatePhase(uint8 _phase) public override onlyRole(Role.ADMIN) {
        gs().phase = _phase;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateKreskian(address _kreskian) public override onlyRole(Role.ADMIN) {
        gs().kreskian = _kreskian;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateQuestForKresk(address _questForKresk) public override onlyRole(Role.ADMIN) {
        gs().questForKresk = _questForKresk;
    }
}
