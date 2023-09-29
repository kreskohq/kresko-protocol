// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {ICommonStateFacet} from "common/interfaces/ICommonStateFacet.sol";
import {ds} from "diamond/State.sol";
import {cs} from "common/State.sol";

contract CommonStateFacet is ICommonStateFacet {
    /// @inheritdoc ICommonStateFacet
    function domainSeparator() external view returns (bytes32) {
        return ds().diamondDomainSeparator;
    }

    /// @inheritdoc ICommonStateFacet
    function getStorageVersion() external view returns (uint256) {
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
    function getMinDebtValue() external view returns (uint256) {
        return cs().minDebtValue;
    }

    /// @inheritdoc ICommonStateFacet
    function getOracleDeviationPct() external view returns (uint256) {
        return cs().oracleDeviationPct;
    }
}
