// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {IProxy} from "vendor/IProxy.sol";
import {WadRay} from "libs/WadRay.sol";
import {Percentages} from "libs/Percentages.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {PushPrice, Oracle, OracleType} from "common/Types.sol";
import {Percents} from "common/Constants.sol";
import {CError} from "common/Errors.sol";
import {Redstone} from "libs/Redstone.sol";
import {cs} from "common/State.sol";
import {scdp, sdi} from "scdp/State.sol";

using WadRay for uint256;
using Percentages for uint256;

/* -------------------------------------------------------------------------- */
/*                                   Getters                                  */
/* -------------------------------------------------------------------------- */

/// @notice Get the price of SDI in USD, oracle precision.
function SDIPrice() view returns (uint256) {
    uint256 totalValue = scdp().totalDebtValueAtRatioSCDP(Percents.ONE_HUNDRED_PERCENT, false);
    if (totalValue == 0) {
        return 10 ** cs().extOracleDecimals;
    }
    return totalValue.wadDiv(sdi().totalDebt);
}

/**
 * @notice Get the oracle price using safety checks for deviation and sequencer uptime
 * @notice reverts if the price deviates more than `_oracleDeviationPct`
 * @param id The asset id
 * @param oracles The list of oracle identifiers
 * @param _oracleDeviationPct the deviation percentage
 */
function safePrice(bytes32 id, OracleType[2] memory oracles, uint256 _oracleDeviationPct) view returns (uint256) {
    uint256[2] memory prices = [oraclePrice(oracles[0], id), oraclePrice(oracles[1], id)];
    if (!isSequencerUp()) {
        return handleSequencerDown(oracles, prices);
    }
    return deducePriceToUse(prices[0], prices[1], _oracleDeviationPct);
}

/**
 * @notice Oracle price, a private view library function.
 * @param _oracleId The oracle id (uint8).
 * @param _assetId The asset id (bytes32).
 * @return uint256 oracle price.
 */
function oraclePrice(OracleType _oracleId, bytes32 _assetId) view returns (uint256) {
    if (_oracleId != OracleType.Redstone) {
        Oracle memory oracle = cs().oracles[_assetId][_oracleId];
        return oracle.priceGetter(oracle.feed);
    }
    return Redstone.getPrice(_assetId);
}

/**
 * @notice Return push oracle price.
 * @param oracles The oracles defined.
 * @param _assetId The asset id (bytes32).
 * @return PushPrice The push oracle price and timestamp.
 */
function pushPrice(OracleType[2] memory oracles, bytes32 _assetId) view returns (PushPrice memory) {
    for (uint8 i; i < oracles.length; i++) {
        OracleType oracleType = oracles[i];
        Oracle memory oracle = cs().oracles[_assetId][oracles[i]];

        if (oracleType == OracleType.Chainlink) {
            return aggregatorV3PriceWithTimestamp(oracle.feed);
        } else if (oracleType == OracleType.API3) {
            return API3PriceWithTimestamp(oracle.feed);
        }
    }

    // Revert if no push oracle is found
    revert CError.NO_PUSH_ORACLE_SET(string(abi.encodePacked(_assetId)));
}

/**
 * @notice Checks the primary and reference price for deviations
 * @notice Reverts if the price deviates more than `_oracleDeviationPct`
 * @param _primaryPrice the primary price source to use
 * @param _referencePrice the reference price to compare primary against
 * @param _oracleDeviationPct the deviation percentage to use for the oracle
 * @return uint256 the price to use
 */
function deducePriceToUse(uint256 _primaryPrice, uint256 _referencePrice, uint256 _oracleDeviationPct) pure returns (uint256) {
    if (_primaryPrice == 0 && _referencePrice == 0) {
        revert CError.ZERO_PRICE();
    }

    if (_referencePrice == 0) return _primaryPrice;
    if (_primaryPrice == 0) return _referencePrice;
    if (
        (_referencePrice.percentMul(1e4 - _oracleDeviationPct) <= _primaryPrice) &&
        (_referencePrice.percentMul(1e4 + _oracleDeviationPct) >= _primaryPrice)
    ) {
        return _primaryPrice;
    }

    // Revert if price deviates more than `_oracleDeviationPct`
    revert CError.PRICE_UNSTABLE(_primaryPrice, _referencePrice);
}

function handleSequencerDown(OracleType[2] memory oracles, uint256[2] memory prices) pure returns (uint256) {
    if (oracles[0] == OracleType.Redstone) {
        return prices[0];
    } else if (oracles[1] == OracleType.Redstone) {
        return prices[1];
    }
    revert CError.SEQUENCER_DOWN_NO_REDSTONE_AVAILABLE();
}

/**
 * @notice Aggregator v3 price getter.
 * @notice returns 0 if oracle price is too old so that fallback oracle can be used instead.
 * @param _oracle The oracle address.
 * @return uint256 Resulting price from the feed.
 */
function aggregatorV3Price(address _oracle) view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(_oracle).latestRoundData();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return 0;
    }
    return uint256(answer);
}

/**
 * @notice Aggregator v3 price with timestamp.
 * @notice returns 0 if oracle price is too old so that fallback oracle can be used instead.
 * @param _oracle The oracle address.
 * @return PushPrice Result of aggregatorV3PriceWithTimestamp.
 */
function aggregatorV3PriceWithTimestamp(address _oracle) view returns (PushPrice memory) {
    (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(_oracle).latestRoundData();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return PushPrice(0, updatedAt);
    }
    return PushPrice(uint256(answer), updatedAt);
}

function API3Price(address _feed) view returns (uint256) {
    (int256 answer, uint256 updatedAt) = IProxy(_feed).read();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    // NOTE: there can be a case where both chainlink and api3 oracles are down, in that case 0 will be returned ???
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return 0;
    }
    return uint256(answer / 1e10); // @todo actual decimals
}

function API3PriceWithTimestamp(address _feed) view returns (PushPrice memory) {
    (int256 answer, uint256 updatedAt) = IProxy(_feed).read();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    // NOTE: there can be a case where both chainlink and api3 oracles are down, in that case 0 will be returned ???
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return PushPrice(0, updatedAt);
    }
    return PushPrice(uint256(answer / 1e10), updatedAt); // @todo actual decimals
}

/* -------------------------------------------------------------------------- */
/*                                    Math                                    */
/* -------------------------------------------------------------------------- */
/**
 * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
 * @param _priceWithOracleDecimals value with extOracleDecimals
 * @return wadPrice with 18 decimals
 */
function oraclePriceToWad(uint256 _priceWithOracleDecimals) view returns (uint256) {
    uint256 oracleDecimals = cs().extOracleDecimals;
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
    uint256 oracleDecimals = cs().extOracleDecimals;
    if (oracleDecimals >= 18) return uint256(_priceWithOracleDecimals);
    return uint256(_priceWithOracleDecimals) * 10 ** (18 - oracleDecimals);
}

/// @notice get oracle decimal precision USD value for `amount`.
/// @param amount amount of tokens to get USD value for.
function usdWad(uint256 amount, uint256 price, uint256 decimals) view returns (uint256) {
    return (amount * (10 ** (18 - cs().extOracleDecimals)) * price) / 10 ** decimals;
}

/**
 * @notice Divides an uint256 @param _value with @param _priceWithOracleDecimals
 * @param _value Left side value of the division
 * @param wadValue result with 18 decimals
 */
function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals) view returns (uint256 wadValue) {
    uint8 oracleDecimals = cs().extOracleDecimals;
    if (oracleDecimals >= 18) return _priceWithOracleDecimals;
    return (_value * 10 ** oracleDecimals) / _priceWithOracleDecimals;
}

/**
 * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
 * @param _wadPrice value with extOracleDecimals
 */
function fromWadPriceToUint(uint256 _wadPrice) view returns (uint256 priceWithOracleDecimals) {
    uint8 oracleDecimals = cs().extOracleDecimals;
    if (oracleDecimals == 18) return _wadPrice;
    return _wadPrice / 10 ** (18 - oracleDecimals);
}
