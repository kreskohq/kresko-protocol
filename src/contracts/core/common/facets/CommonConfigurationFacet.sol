// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {CModifiers} from "common/Modifiers.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {DiamondEvent} from "common/Events.sol";

import {Constants} from "common/Constants.sol";
import {CommonInitArgs, Role, NOT_ENTERED} from "common/Types.sol";
import {ICommonConfigurationFacet} from "common/interfaces/ICommonConfigurationFacet.sol";
import {IAuthorizationFacet} from "common/interfaces/IAuthorizationFacet.sol";
import {Error} from "common/Errors.sol";
import {cs} from "common/State.sol";
import {Auth} from "common/Auth.sol";

import {MEvent} from "minter/Events.sol";
import {ds} from "diamond/State.sol";

contract CommonConfigurationFacet is ICommonConfigurationFacet, CModifiers, DSModifiers {
    function initializeCommon(CommonInitArgs memory args) external onlyOwner {
        require(ds().storageVersion == 1, Error.ALREADY_INITIALIZED);
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
    function updateMinDebtValue(uint128 _newMinDebtValue) public override onlyRole(Role.ADMIN) {
        require(_newMinDebtValue <= Constants.MAX_MIN_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        cs().minDebtValue = _newMinDebtValue;

        emit MEvent.MinimumDebtValueUpdated(_newMinDebtValue);
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateFeeRecipient(address _newFeeRecipient) public override onlyRole(Role.ADMIN) {
        require(_newFeeRecipient != address(0), Error.ADDRESS_INVALID_FEERECIPIENT);

        cs().feeRecipient = _newFeeRecipient;
        emit MEvent.FeeRecipientUpdated(_newFeeRecipient);
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateExtOracleDecimals(uint8 _decimals) public onlyRole(Role.ADMIN) {
        cs().extOracleDecimals = _decimals;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateOracleDeviationPct(uint248 _oracleDeviationPct) public onlyRole(Role.ADMIN) {
        require(_oracleDeviationPct <= 1 ether, Error.INVALID_ORACLE_DEVIATION_PCT);
        cs().oracleDeviationPct = _oracleDeviationPct;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateSequencerUptimeFeed(address _sequencerUptimeFeed) public override onlyRole(Role.ADMIN) {
        cs().sequencerUptimeFeed = _sequencerUptimeFeed;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateSequencerGracePeriodTime(uint48 _sequencerGracePeriodTime) public onlyRole(Role.ADMIN) {
        cs().sequencerGracePeriodTime = _sequencerGracePeriodTime;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateOracleTimeout(uint48 _oracleTimeout) public onlyRole(Role.ADMIN) {
        cs().oracleTimeout = _oracleTimeout;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updatePhase(uint8 _phase) public override onlyRole(Role.ADMIN) {
        cs().phase = _phase;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateKreskian(address _kreskian) public override onlyRole(Role.ADMIN) {
        cs().kreskian = _kreskian;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function updateQuestForKresk(address _questForKresk) public override onlyRole(Role.ADMIN) {
        cs().questForKresk = _questForKresk;
    }
}
