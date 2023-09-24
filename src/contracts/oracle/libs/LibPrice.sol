//SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.19;

import {ms} from "../../minter/MinterStorage.sol";
import {os} from "../OracleStorage.sol";
import {Oracle, OracleType} from "../OracleState.sol";
import {CollateralAsset, KrAsset} from "../../minter/MinterTypes.sol";
import {Error} from "../../libs/Errors.sol";
import {AggregatorV3Interface} from "../../vendor/AggregatorV3Interface.sol";
import {LibRedstone} from "../../minter/libs/LibRedstone.sol";
import {WadRay} from "../../libs/WadRay.sol";

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
            if (self.oracles[0] != uint8(OracleType.Redstone) && self.oracles[1] != uint8(OracleType.Redstone)) {
                revert(Error.NO_REDSTONE_ORACLE);
            }
            return _oraclePrice(1, self.id);
        }
        return _price(self.id, self.oracles, _oracleDeviationPct);
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
            if (self.oracles[0] != uint8(OracleType.Redstone) && self.oracles[1] != uint8(OracleType.Redstone)) {
                revert(Error.NO_REDSTONE_ORACLE);
            }
            return _oraclePrice(1, self.id);
        }
        return _price(self.id, self.oracles, _oracleDeviationPct);
    }

    /**
     * @notice gets the prices from the oracles
     * @param self The self (CollateralAsset).
     * @return uint256 List of oracle prices.
     */
    function oraclePrices(CollateralAsset memory self) internal view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](2);
        prices[0] = _oraclePrice(self.oracles[0], self.id);
        prices[1] = _oraclePrice(self.oracles[1], self.id);
        return prices;
    }

    /**
     * @notice gets the prices from the oracles
     * @param self The self (KrAsset).
     * @return uint256 List of oracle prices.
     */
    function oraclePrices(KrAsset memory self) internal view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](2);
        prices[0] = _oraclePrice(self.oracles[0], self.id);
        prices[1] = _oraclePrice(self.oracles[1], self.id);
        return prices;
    }

    /* -------------------------------------------------------------------------- */
    /*                              PRIVATE FUNCTIONS                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice checks if the sequencer is up.
     * @return bool returns true/false if the sequencer is up/not.
     */
    function _checkSequencerUptimeFeed() private view returns (bool) {
        if (ms().sequencerUptimeFeed != address(0)) {
            (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(ms().sequencerUptimeFeed).latestRoundData();
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

    /**
     * @notice Oracle price, a private view library function.
     * @param _oracleId The oracle id (uint8).
     * @param _assetId The asset id (bytes32).
     * @return uint256 oracle price.
     */
    function _oraclePrice(uint8 _oracleId, bytes32 _assetId) internal view returns (uint256) {
        Oracle memory oracle = os().oracles[_assetId][_oracleId];
        return _oracleId == 1 ? LibRedstone.getPrice(_assetId) : oracle.priceGetter(oracle.feed);
    }

    /**
     * @notice check the price and return it
     * @notice reverts if the price deviates more than `_oracleDeviationPct`
     * @param id asset id
     * @param oracles list of oracles
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function _price(bytes32 id, uint8[2] memory oracles, uint256 _oracleDeviationPct) internal view returns (uint256) {
        uint256[] memory prices = new uint256[](2);
        prices[0] = _oraclePrice(oracles[0], id);
        prices[1] = _oraclePrice(oracles[1], id);

        if (prices[0] == 0) return prices[1];
        if (prices[1] == 0) return prices[0];
        if (
            (prices[1].wadMul(1 ether - _oracleDeviationPct) <= prices[0]) &&
            (prices[1].wadMul(1 ether + _oracleDeviationPct) >= prices[0])
        ) return prices[0];

        // Revert if prices deviates more than `_oracleDeviationPct`
        revert(Error.ORACLE_PRICE_UNSTABLE);
    }
}
