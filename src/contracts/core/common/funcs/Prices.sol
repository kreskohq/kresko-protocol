// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {IProxy} from "vendor/IProxy.sol";
import {WadRay} from "libs/WadRay.sol";
import {Strings} from "libs/Strings.sol";
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
using Strings for bytes32;
using Strings for bytes12;

/* -------------------------------------------------------------------------- */
/*                                   Getters                                  */
/* -------------------------------------------------------------------------- */

/// @notice Get the price of SDI in USD, oracle precision.
function SDIPrice() view returns (uint256) {
    uint256 totalValue = scdp().totalDebtValueAtRatioSCDP(Percents.HUNDRED, false);
    if (totalValue == 0) {
        return 10 ** sdi().sdiPricePrecision;
    }
    return totalValue.wadDiv(sdi().totalDebt);
}

/**
 * @notice Get the oracle price using safety checks for deviation and sequencer uptime
 * @notice reverts if the price deviates more than `_oracleDeviationPct`
 * @param _assetId The asset id
 * @param _oracles The list of oracle identifiers
 * @param _oracleDeviationPct the deviation percentage
 */
function safePrice(bytes12 _assetId, OracleType[2] memory _oracles, uint256 _oracleDeviationPct) view returns (uint256) {
    uint256[2] memory prices = [oraclePrice(_oracles[0], _assetId), oraclePrice(_oracles[1], _assetId)];
    // Eagerly check zeroes
    if (prices[0] == 0 && prices[1] == 0) {
        revert CError.ZERO_PRICE(_assetId.toString());
    }

    if (!isSequencerUp()) {
        return handleSequencerDown(_oracles, prices);
    }

    return deducePrice(prices[0], prices[1], _oracleDeviationPct);
}

/**
 * @notice Oracle price, a private view library function.
 * @param _oracleId The oracle id (uint8).
 * @param _assetId The asset id (bytes32).
 * @return uint256 oracle price.
 */
function oraclePrice(OracleType _oracleId, bytes12 _assetId) view returns (uint256) {
    if (_oracleId != OracleType.Redstone) {
        Oracle memory oracle = cs().oracles[_assetId][_oracleId];
        return oracle.priceGetter(oracle.feed);
    }
    return Redstone.getPrice(_assetId);
}

/**
 * @notice Return push oracle price.
 * @param _oracles The oracles defined.
 * @param _assetId The asset id (bytes32).
 * @return PushPrice The push oracle price and timestamp.
 */
function pushPrice(OracleType[2] memory _oracles, bytes12 _assetId) view returns (PushPrice memory) {
    for (uint8 i; i < _oracles.length; i++) {
        OracleType oracleType = _oracles[i];
        Oracle memory oracle = cs().oracles[_assetId][_oracles[i]];

        if (oracleType == OracleType.Chainlink) {
            return aggregatorV3PriceWithTimestamp(oracle.feed);
        } else if (oracleType == OracleType.API3) {
            return API3PriceWithTimestamp(oracle.feed);
        }
    }

    // Revert if no push oracle is found
    revert CError.NO_PUSH_ORACLE_SET(_assetId.toString());
}

/**
 * @notice Checks the primary and reference price for deviations.
 * @notice Reverts if the price deviates more than `_oracleDeviationPct`
 * @param _primaryPrice the primary price source to use
 * @param _referencePrice the reference price to compare primary against
 * @param _oracleDeviationPct the deviation percentage to use for the oracle
 * @return uint256 Primary price if its within deviation range of reference price.
 * Or the primary price is reference price is 0.
 * Or the reference price if primary price is 0.
 * Or revert if price deviates more than `_oracleDeviationPct`
 */
function deducePrice(uint256 _primaryPrice, uint256 _referencePrice, uint256 _oracleDeviationPct) pure returns (uint256) {
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
 * @notice Gets answer from AggregatorV3 type feed.
 * @param _feedAddr The feed address.
 * @return uint256 Parsed answer from the feed, 0 if its stale.
 */
function aggregatorV3Price(address _feedAddr) view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(_feedAddr).latestRoundData();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(_feedAddr, answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return 0;
    }
    return uint256(answer);
}

/**
 * @notice Gets answer from AggregatorV3 type feed with timestamp.
 * @param _feedAddr The feed address.
 * @return PushPrice Parsed answer and timestamp.
 */
function aggregatorV3PriceWithTimestamp(address _feedAddr) view returns (PushPrice memory) {
    (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(_feedAddr).latestRoundData();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(_feedAddr, answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return PushPrice(0, updatedAt);
    }
    return PushPrice(uint256(answer), updatedAt);
}

/**
 * @notice Gets answer from IProxy type feed.
 * @param _feedAddr The feed address.
 * @return uint256 Parsed answer from the feed, 0 if its stale.
 */
function API3Price(address _feedAddr) view returns (uint256) {
    (int256 answer, uint256 updatedAt) = IProxy(_feedAddr).read();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(_feedAddr, answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    // NOTE: there can be a case where both chainlink and api3 oracles are down, in that case 0 will be returned ???
    if (block.timestamp - updatedAt > cs().oracleTimeout) {
        return 0;
    }
    return uint256(answer / 1e10); // @todo actual decimals
}

/**
 * @notice Gets answer from IProxy type feed with timestamp.
 * @param _feedAddr The feed address.
 * @return PushPrice Parsed answer and timestamp.
 */
function API3PriceWithTimestamp(address _feedAddr) view returns (PushPrice memory) {
    (int256 answer, uint256 updatedAt) = IProxy(_feedAddr).read();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(_feedAddr, answer);
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
 * @notice Converts an uint256 with oracleDecimals into a number with 18 decimals
 * @param _priceOracleDecimals value with oracleDecimals
 * @param _decimals precision
 * @return wadPrice with 18 decimals
 */
function oraclePriceToWad(uint256 _priceOracleDecimals, uint8 _decimals) pure returns (uint256) {
    if (_priceOracleDecimals == 0) return 0;
    if (_decimals == 18) {
        return _priceOracleDecimals;
    }
    return _priceOracleDecimals * 10 ** (18 - _decimals);
}

/**
 * @notice Converts an int256 with some decimal precision into a number with 18 decimals
 * @param _priceDecimalPrecision value with oracleDecimals
 * @param _decimals price precision
 * @return wadPrice price with 18 decimals
 */
function oraclePriceToWad(int256 _priceDecimalPrecision, uint8 _decimals) pure returns (uint256) {
    if (_priceDecimalPrecision <= 0) return 0;
    if (_decimals >= 18) return uint256(_priceDecimalPrecision);
    return uint256(_priceDecimalPrecision) * 10 ** (18 - _decimals);
}

/// @notice get some decimal precision USD value for `_amount`.
/// @param _amount amount of tokens to get USD value for.
/// @param _price amount of tokens to get USD value for.
/// @param _decimals precision
/// @return value USD value for `_amount` with `_decimals` precision.
function usdWad(uint256 _amount, uint256 _price, uint8 _decimals) pure returns (uint256) {
    if (_amount == 0 || _price == 0) return 0;
    return (_amount * (10 ** (18 - _decimals)) * _price) / 10 ** _decimals;
}

/**
 * @notice Divides an uint256 @param _value with @param _priceWithOracleDecimals
 * @param _value Left side value of the division
 * @param _decimals precision
 * @param wadValue result with 18 decimals
 */
function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals, uint8 _decimals) pure returns (uint256 wadValue) {
    if (_value == 0 || _priceWithOracleDecimals == 0) return 0;
    if (_decimals >= 18) return _priceWithOracleDecimals;
    return (_value * 10 ** _decimals) / _priceWithOracleDecimals;
}

/**
 * @notice Converts an uint256 with wad precision into a number with @param _decimals precision
 * @param _wadValue value with wad precision
 * @return value with decimal precision
 */
function wadToDecimal(uint256 _wadValue, uint8 _decimals) pure returns (uint256 value) {
    if (_wadValue == 0) return 0;
    if (_decimals == 18) return _wadValue;
    return _wadValue / 10 ** (18 - _decimals);
}
