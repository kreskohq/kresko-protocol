// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {ICommonStateFacet} from "common/interfaces/ICommonStateFacet.sol";
import {Redstone} from "libs/Redstone.sol";

import {Enums} from "common/Constants.sol";
import {cs, gm} from "common/State.sol";
import {aggregatorV3Price, API3Price, pythPrice, vaultPrice} from "common/funcs/Prices.sol";
import {Oracle} from "common/Types.sol";

contract CommonStateFacet is ICommonStateFacet {
    /// @inheritdoc ICommonStateFacet
    function getFeeRecipient() external view returns (address) {
        return cs().feeRecipient;
    }

    /// @inheritdoc ICommonStateFacet
    function getPythEndpoint() external view returns (address) {
        return cs().pythEp;
    }

    /// @inheritdoc ICommonStateFacet
    function getDefaultOraclePrecision() external view returns (uint8) {
        return cs().oracleDecimals;
    }

    /// @inheritdoc ICommonStateFacet
    function getGatingManager() external view returns (address) {
        return address(gm().manager);
    }

    /// @inheritdoc ICommonStateFacet
    function getOracleDeviationPct() external view returns (uint16) {
        return cs().maxPriceDeviationPct;
    }

    /// @inheritdoc ICommonStateFacet
    function getSequencerUptimeFeed() external view returns (address) {
        return cs().sequencerUptimeFeed;
    }

    /// @inheritdoc ICommonStateFacet
    function getSequencerGracePeriod() external view returns (uint32) {
        return cs().sequencerGracePeriodTime;
    }

    /// @inheritdoc ICommonStateFacet
    function getOracleOfTicker(bytes32 _ticker, Enums.OracleType _oracleType) public view returns (Oracle memory) {
        return cs().oracles[_ticker][_oracleType];
    }

    /// @inheritdoc ICommonStateFacet
    function getRedstonePrice(bytes32 _ticker) external view returns (uint256) {
        return Redstone.getPrice(_ticker, getOracleOfTicker(_ticker, Enums.OracleType.Redstone).staleTime);
    }

    /// @inheritdoc ICommonStateFacet
    function getPythPrice(bytes32 _ticker) external view returns (uint256) {
        Oracle memory oracle = getOracleOfTicker(_ticker, Enums.OracleType.Redstone);
        return pythPrice(oracle.pythId, oracle.staleTime);
    }

    /// @inheritdoc ICommonStateFacet
    function getAPI3Price(bytes32 _ticker) external view returns (uint256) {
        Oracle memory oracle = getOracleOfTicker(_ticker, Enums.OracleType.API3);
        return API3Price(oracle.feed, oracle.staleTime);
    }

    /// @inheritdoc ICommonStateFacet
    function getVaultPrice(bytes32 _ticker) external view returns (uint256) {
        return vaultPrice(getOracleOfTicker(_ticker, Enums.OracleType.Vault).feed);
    }

    /// @inheritdoc ICommonStateFacet
    function getChainlinkPrice(bytes32 _ticker) external view returns (uint256) {
        Oracle memory oracle = getOracleOfTicker(_ticker, Enums.OracleType.Chainlink);
        return aggregatorV3Price(oracle.feed, oracle.staleTime);
    }
}
