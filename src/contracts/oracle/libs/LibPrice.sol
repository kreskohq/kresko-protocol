//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {ms} from "../../minter/MinterStorage.sol";
import {os} from "../OracleStorage.sol";
import {CollateralAsset, KrAsset} from "../../minter/MinterTypes.sol";
import {Error} from "../../libs/Errors.sol";
import {AggregatorV3Interface} from "../../vendor/AggregatorV3Interface.sol";
import {LibRedstone} from "../../minter/libs/LibRedstone.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {IProxy} from "../interfaces/IProxy.sol";

library LibPrice {
    using WadRay for uint256;

    /**
     * @notice Get Aggregrated price from selected oracles
     * @param self the collateral asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(CollateralAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        bool sequencerStatus = _checkSequencerUptimeFeed();
        // if sequencer is down return redstone price only
        // if redstone oracle is not in oracles list error out
        if (!sequencerStatus) {
            if (self.oracles[0] != 1 && self.oracles[1] != 1) {
                revert("Sequencer down and redstone oracle not in oracles list");
            }
            return _getRedstonePrice(self.id);
        }
        return _getPrice(self.id, self.oracles, _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the kresko asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(KrAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        bool sequencerStatus = _checkSequencerUptimeFeed();
        // if sequencer is down return redstone price only
        // if redstone oracle is not in oracles list error out
        if (!sequencerStatus) {
            if (self.oracles[0] != 1 && self.oracles[1] != 1) {
                revert("Sequencer down and redstone oracle not in oracles list");
            }
            return _getRedstonePrice(self.id);
        }
        return _getPrice(self.id, self.oracles, _oracleDeviationPct);
    }

    function getOraclePrices(CollateralAsset memory self) internal view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](2);
        prices[0] = _selectOracle(self.oracles[0], self.id);
        prices[1] = _selectOracle(self.oracles[1], self.id);
        return prices;
    }

    function getOraclePrices(KrAsset memory self) internal view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](2);
        prices[0] = _selectOracle(self.oracles[0], self.id);
        prices[1] = _selectOracle(self.oracles[1], self.id);
        return prices;
    }

    /* -------------------------------------------------------------------------- */
    /*                              PRIVATE FUNCTIONS                             */
    /* -------------------------------------------------------------------------- */

    function _checkSequencerUptimeFeed() private view returns (bool) {
        if (ms().sequencerUptimeFeed != address(0)) {
            (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(ms().sequencerUptimeFeed)
                .latestRoundData();
            bool isSequencerUp = answer == 0;
            if (!isSequencerUp) {
                return false;
            }
            // Make sure the grace period has passed after the
            // sequencer is back up.
            uint256 timeSinceUp = block.timestamp - startedAt;
            if (timeSinceUp <= ms().sequencerGracePeriodTime) {
                return false;
            }
        }
        return true;
    }

    function _selectOracle(uint8 _oracle, bytes32 id) private view returns (uint256) {
        return _oracle == 0 ? _getChainlinkPrice(id) : _oracle == 1 ? _getRedstonePrice(id) : _getApi3Price(id);
    }

    /**
     * @notice check the price and return it
     * @notice reverts if the price deviates more than `_oracleDeviationPct`
     * @param id asset id
     * @param oracles list of oracles
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function _getPrice(
        bytes32 id,
        uint8[2] memory oracles,
        uint256 _oracleDeviationPct
    ) private view returns (uint256) {
        uint256[] memory prices = new uint256[](2);
        prices[0] = _selectOracle(oracles[0], id);
        prices[1] = _selectOracle(oracles[1], id);

        if (prices[0] == 0) return prices[1];
        if (prices[1] == 0) return prices[0];
        if (
            (prices[1].wadMul(1 ether - _oracleDeviationPct) <= prices[0]) &&
            (prices[1].wadMul(1 ether + _oracleDeviationPct) >= prices[0])
        ) return prices[0];

        // Revert if prices deviates more than `_oracleDeviationPct`
        revert(Error.ORACLE_PRICE_UNSTABLE);
    }

    function _getChainlinkPrice(bytes32 id) private view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(os().chainlinkFeeds[id]).latestRoundData();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }

        return uint256(answer);
    }

    function _getRedstonePrice(bytes32 id) private view returns (uint256) {
        return LibRedstone.getPrice(id);
    }

    function _getApi3Price(bytes32 id) private view returns (uint256) {
        (int256 answer, uint256 updatedAt) = IProxy(os().api3Feeds[id]).read();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        // NOTE: there can be a case where both chainlink and api3 oracles are down, in that case 0 will be returned ???
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer / 1e10);
    }
}
