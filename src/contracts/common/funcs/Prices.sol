// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {WadRay} from "libs/WadRay.sol";

import {Error} from "common/Errors.sol";
import {ms} from "minter/State.sol";

using WadRay for uint256;

/**
 * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
 */
function oraclePrice(AggregatorV3Interface oracle) view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = oracle.latestRoundData();
    require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    if (block.timestamp - updatedAt > ms().oracleTimeout) {
        return 0;
    }
    return uint256(answer);
}

/**
 * @notice check the price and return it
 * @notice reverts if the price deviates more than `_oracleDeviationPct`
 * @param _chainlinkPrice chainlink price
 * @param _redstonePrice redstone price
 * @param _oracleDeviationPct the deviation percentage to use for the oracle
 */

function safePrice(
    uint256 _chainlinkPrice,
    uint256 _redstonePrice,
    uint256 _oracleDeviationPct
) view returns (uint256) {
    if (ms().sequencerUptimeFeed != address(0)) {
        (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(ms().sequencerUptimeFeed).latestRoundData();
        bool isSequencerUp = answer == 0;
        if (!isSequencerUp) {
            return _redstonePrice;
        }
        // Make sure the grace period has passed after the
        // sequencer is back up.
        uint256 timeSinceUp = block.timestamp - startedAt;
        if (timeSinceUp <= ms().sequencerGracePeriodTime) {
            return _redstonePrice;
        }
    }
    if (_chainlinkPrice == 0 && _redstonePrice > 0) return _redstonePrice;
    if (_redstonePrice == 0) return _chainlinkPrice;
    if (
        (_redstonePrice.wadMul(1 ether - _oracleDeviationPct) <= _chainlinkPrice) &&
        (_redstonePrice.wadMul(1 ether + _oracleDeviationPct) >= _chainlinkPrice)
    ) {
        return _chainlinkPrice;
    }

    // Revert if price deviates more than `_oracleDeviationPct`
    revert(Error.ORACLE_PRICE_UNSTABLE);
}

/**
 * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
 * @param _priceWithOracleDecimals value with extOracleDecimals
 * @return wadPrice with 18 decimals
 */
function oraclePriceToWad(uint256 _priceWithOracleDecimals) view returns (uint256) {
    uint256 oracleDecimals = ms().extOracleDecimals;
    if (oracleDecimals == 18) {
        return _priceWithOracleDecimals;
    }
    return _priceWithOracleDecimals * 10 ** (18 - oracleDecimals);
}

/**
 * @notice Converts an int256 with extOracleDecimals into a number with 18 decimals
 * @param _priceWithOracleDecimals value with extOracleDecimals
 * @return wadPrice price with 18 decimals
 */
function oraclePriceToWad(int256 _priceWithOracleDecimals) view returns (uint256) {
    uint256 oracleDecimals = ms().extOracleDecimals;
    if (oracleDecimals >= 18) return uint256(_priceWithOracleDecimals);
    return uint256(_priceWithOracleDecimals) * 10 ** (18 - oracleDecimals);
}

/// @notice get oracle decimal precision USD value for `amount`.
/// @param amount amount of tokens to get USD value for.
function usdWad(uint256 amount, uint256 price, uint256 decimals) view returns (uint256) {
    return (amount * (10 ** (18 - ms().extOracleDecimals)) * price) / 10 ** decimals;
}

/**
 * @notice Divides an uint256 @param _value with @param _priceWithOracleDecimals
 * @param _value Left side value of the division
 * @param wadValue result with 18 decimals
 */
function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals) view returns (uint256 wadValue) {
    uint8 oracleDecimals = ms().extOracleDecimals;
    if (oracleDecimals >= 18) return _priceWithOracleDecimals;
    return (_value * 10 ** oracleDecimals) / _priceWithOracleDecimals;
}

/**
 * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
 * @param _wadPrice value with extOracleDecimals
 */
function fromWadPriceToUint(uint256 _wadPrice) view returns (uint256 priceWithOracleDecimals) {
    uint8 oracleDecimals = ms().extOracleDecimals;
    if (oracleDecimals == 18) return _wadPrice;
    return _wadPrice / 10 ** (18 - oracleDecimals);
}
