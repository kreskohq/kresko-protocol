// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {ICommonStateFacet} from "common/interfaces/ICommonStateFacet.sol";
import {ds} from "diamond/State.sol";
import {cs} from "common/State.sol";

contract CommonStateFacet is ICommonStateFacet {
    /// @inheritdoc ICommonStateFacet
    function domainSeparator() external view returns (bytes32) {
        return ds().diamondDomainSeparator;
    }

    /// @inheritdoc ICommonStateFacet
    function getStorageVersion() external view returns (uint96) {
        return ds().storageVersion;
    }

    /// @inheritdoc ICommonStateFacet
    function getFeeRecipient() external view returns (address) {
        return cs().feeRecipient;
    }

    /// @inheritdoc ICommonStateFacet
    function getExtOracleDecimals() external view returns (uint8) {
        return cs().oracleDecimals;
    }

    /// @inheritdoc ICommonStateFacet
    function getMinDebtValue() external view returns (uint96) {
        return cs().minDebtValue;
    }

    /// @inheritdoc ICommonStateFacet
    function getOracleDeviationPct() external view returns (uint16) {
        return cs().oracleDeviationPct;
    }

    /// @inheritdoc ICommonStateFacet
    function getSequencerUptimeFeed() external view returns (address) {
        return cs().sequencerUptimeFeed;
    }

    /// @inheritdoc ICommonStateFacet
    function getSequencerUptimeFeedGracePeriod() external view returns (uint32) {
        return cs().sequencerGracePeriodTime;
    }

    /// @inheritdoc ICommonStateFacet
    function getOracleTimeout() external view returns (uint32) {
        return cs().oracleTimeout;
    }
}
