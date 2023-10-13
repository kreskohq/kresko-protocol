// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {CommonStateFacet} from "common/facets/CommonStateFacet.sol";
import {ICommonConfigurationFacet} from "common/interfaces/ICommonConfigurationFacet.sol";
import {IAuthorizationFacet} from "common/interfaces/IAuthorizationFacet.sol";

import {Strings} from "libs/Strings.sol";
import {Modifiers} from "common/Modifiers.sol";
import {DSModifiers} from "diamond/DSModifiers.sol";
import {ds} from "diamond/DState.sol";
import {MEvent} from "minter/MEvent.sol";

import {Oracle, FeedConfiguration, CommonInitArgs} from "common/Types.sol";
import {Role, Enums, Constants} from "common/Constants.sol";
import {Errors} from "common/Errors.sol";
import {cs, gs} from "common/State.sol";
import {Auth} from "common/Auth.sol";
import {Validations} from "common/Validations.sol";

contract CommonConfigurationFacet is ICommonConfigurationFacet, Modifiers, DSModifiers {
    using Strings for bytes32;

    function initializeCommon(CommonInitArgs calldata args) external onlyDiamondOwner {
        if (cs().entered != 0) revert Errors.COMMON_ALREADY_INITIALIZED();

        cs().entered = Constants.NOT_ENTERED;
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

        setFeeRecipient(args.treasury);
        setMinDebtValue(args.minDebtValue);
        setDefaultOraclePrecision(args.oracleDecimals);
        setSequencerUptimeFeed(args.sequencerUptimeFeed);
        setOracleDeviationPct(args.oracleDeviationPct);
        setSequencerGracePeriod(args.sequencerGracePeriodTime);
        setOracleTimeout(args.oracleTimeout);
        setGatingPhase(args.phase);
        setKreskianCollection(args.kreskian);
        setQuestForKreskCollection(args.questForKresk);

        ds().supportedInterfaces[type(IAuthorizationFacet).interfaceId] = true;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setMinDebtValue(uint96 _newMinDebtValue) public override onlyRole(Role.ADMIN) {
        Validations.validateMinDebtValue(_newMinDebtValue);
        emit MEvent.MinimumDebtValueUpdated(cs().minDebtValue, _newMinDebtValue);
        cs().minDebtValue = _newMinDebtValue;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setFeeRecipient(address _newFeeRecipient) public override onlyRole(Role.ADMIN) {
        Validations.validateFeeRecipient(_newFeeRecipient);
        emit MEvent.FeeRecipientUpdated(cs().feeRecipient, _newFeeRecipient);
        cs().feeRecipient = _newFeeRecipient;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setDefaultOraclePrecision(uint8 _decimals) public onlyRole(Role.ADMIN) {
        Validations.validateOraclePrecision(_decimals);
        cs().oracleDecimals = _decimals;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setOracleDeviationPct(uint16 _oracleDeviationPct) public onlyRole(Role.ADMIN) {
        Validations.validateOracleDeviationPct(_oracleDeviationPct);
        cs().oracleDeviationPct = _oracleDeviationPct;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setFeedsForTicker(bytes32 _ticker, FeedConfiguration calldata _feedConfig) external onlyRole(Role.ADMIN) {
        Enums.OracleType[2] memory oracles = _feedConfig.oracleIds;
        address[2] memory feeds = _feedConfig.feeds;
        if (oracles.length != feeds.length) {
            revert Errors.ARRAY_LENGTH_MISMATCH(_ticker.toString(), oracles.length, feeds.length);
        }
        for (uint256 i; i < oracles.length; i++) {
            if (oracles[i] == Enums.OracleType.Chainlink) {
                setChainLinkFeed(_ticker, feeds[i]);
            } else if (oracles[i] == Enums.OracleType.API3) {
                setApi3Feed(_ticker, feeds[i]);
            } else if (oracles[i] == Enums.OracleType.Vault) {
                setVaultFeed(_ticker, feeds[i]);
            }
        }
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setChainlinkFeeds(bytes32[] calldata _tickers, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        if (_tickers.length != _feeds.length) revert Errors.ARRAY_LENGTH_MISMATCH("", _tickers.length, _feeds.length);

        for (uint256 i; i < _tickers.length; i++) {
            setChainLinkFeed(_tickers[i], _feeds[i]);
        }
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setApi3Feeds(bytes32[] calldata _tickers, address[] calldata _feeds) public onlyRole(Role.ADMIN) {
        if (_tickers.length != _feeds.length) revert Errors.ARRAY_LENGTH_MISMATCH("", _tickers.length, _feeds.length);

        for (uint256 i; i < _tickers.length; i++) {
            setApi3Feed(_tickers[i], _feeds[i]);
        }
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setChainLinkFeed(bytes32 _ticker, address _feedAddr) public onlyRole(Role.ADMIN) {
        if (_feedAddr == address(0)) revert Errors.FEED_ZERO_ADDRESS(_ticker.toString());

        cs().oracles[_ticker][Enums.OracleType.Chainlink] = Oracle(
            _feedAddr,
            CommonStateFacet(address(this)).getChainlinkPrice
        );
        if (CommonStateFacet(address(this)).getChainlinkPrice(_feedAddr) == 0) {
            revert Errors.INVALID_CL_PRICE(_ticker.toString(), _feedAddr);
        }
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setApi3Feed(bytes32 _ticker, address _feedAddr) public onlyRole(Role.ADMIN) {
        if (_feedAddr == address(0)) revert Errors.FEED_ZERO_ADDRESS(_ticker.toString());

        cs().oracles[_ticker][Enums.OracleType.API3] = Oracle(_feedAddr, CommonStateFacet(address(this)).getAPI3Price);

        if (CommonStateFacet(address(this)).getAPI3Price(_feedAddr) == 0) {
            revert Errors.INVALID_API3_PRICE(_ticker.toString(), _feedAddr);
        }
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setVaultFeed(bytes32 _ticker, address _vaultAddr) public onlyRole(Role.ADMIN) {
        if (_vaultAddr == address(0)) revert Errors.FEED_ZERO_ADDRESS(_ticker.toString());

        cs().oracles[_ticker][Enums.OracleType.Vault] = Oracle(_vaultAddr, CommonStateFacet(address(this)).getVaultPrice);
        if (CommonStateFacet(address(this)).getVaultPrice(_vaultAddr) == 0) {
            // reverts internally above if price is 0
            revert Errors.INVALID_VAULT_PRICE(_ticker.toString(), _vaultAddr);
        }
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setSequencerUptimeFeed(address _sequencerUptimeFeed) public override onlyRole(Role.ADMIN) {
        cs().sequencerUptimeFeed = _sequencerUptimeFeed;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setSequencerGracePeriod(uint32 _sequencerGracePeriodTime) public onlyRole(Role.ADMIN) {
        cs().sequencerGracePeriodTime = _sequencerGracePeriodTime;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setOracleTimeout(uint32 _oracleTimeout) public onlyRole(Role.ADMIN) {
        cs().oracleTimeout = _oracleTimeout;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setGatingPhase(uint8 _phase) public override onlyRole(Role.ADMIN) {
        gs().phase = _phase;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setKreskianCollection(address _kreskian) public override onlyRole(Role.ADMIN) {
        gs().kreskian = _kreskian;
    }

    /// @inheritdoc ICommonConfigurationFacet
    function setQuestForKreskCollection(address _questForKresk) public override onlyRole(Role.ADMIN) {
        gs().questForKresk = _questForKresk;
    }
}
