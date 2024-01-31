// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IAPI3} from "kresko-lib/vendor/IAPI3.sol";
import {IVaultRateProvider} from "vault/interfaces/IVaultRateProvider.sol";

import {WadRay} from "libs/WadRay.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Redstone} from "libs/Redstone.sol";

import {Errors} from "common/Errors.sol";
import {cs} from "common/State.sol";
import {scdp, sdi} from "scdp/SState.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {RawPrice, Oracle} from "common/Types.sol";
import {Percents, Enums} from "common/Constants.sol";
import {fromWad, toWad} from "common/funcs/Math.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {Result} from "vendor/pyth/PythScript.sol";

using WadRay for uint256;
using PercentageMath for uint256;
using Strings for bytes32;

/* -------------------------------------------------------------------------- */
/*                                   Getters                                  */
/* -------------------------------------------------------------------------- */

/**
 * @notice Gets the oracle price using safety checks for deviation and sequencer uptime
 * @notice Reverts when price deviates more than `_oracleDeviationPct`
 * @param _ticker Ticker of the price
 * @param _oracles The list of oracle identifiers
 * @param _oracleDeviationPct the deviation percentage
 */
function safePrice(bytes32 _ticker, Enums.OracleType[2] memory _oracles, uint256 _oracleDeviationPct) view returns (uint256) {
    uint256[2] memory prices = [oraclePrice(_oracles[0], _ticker), oraclePrice(_oracles[1], _ticker)];
    if (prices[0] == 0 && prices[1] == 0) {
        revert Errors.ZERO_OR_STALE_PRICE(_ticker.toString(), [uint8(_oracles[0]), uint8(_oracles[1])]);
    }

    // Enums.OracleType.Vault uses the same check, reverting if the sequencer is down.
    if (!isSequencerUp(cs().sequencerUptimeFeed, cs().sequencerGracePeriodTime)) {
        revert Errors.L2_SEQUENCER_DOWN();
    }

    return deducePrice(prices[0], prices[1], _oracleDeviationPct);
}

/**
 * @notice Call the price getter for the oracle provided and return the price.
 * @param _oracleId The oracle id (uint8).
 * @param _ticker Ticker for the asset
 * @return uint256 oracle price.
 * This will return 0 if the oracle is not set.
 */
function oraclePrice(Enums.OracleType _oracleId, bytes32 _ticker) view returns (uint256) {
    if (_oracleId == Enums.OracleType.Empty) return 0;
    Oracle memory config = cs().oracles[_ticker][_oracleId];

    if (_oracleId == Enums.OracleType.Redstone) return Redstone.getPrice(_ticker, config.staleTime);

    if (_oracleId == Enums.OracleType.Pyth) return pythPrice(config.pythId, config.staleTime);

    if (_oracleId == Enums.OracleType.Vault) {
        return vaultPrice(config.feed);
    }

    if (_oracleId == Enums.OracleType.Chainlink) {
        return aggregatorV3Price(config.feed, config.staleTime);
    }

    if (_oracleId == Enums.OracleType.API3) {
        return API3Price(config.feed, config.staleTime);
    }

    // Revert if no answer is found
    revert Errors.UNSUPPORTED_ORACLE(_ticker.toString(), uint8(_oracleId));
}

/**
 * @notice Checks the primary and reference price for deviations.
 * @notice Reverts if the price deviates more than `_oracleDeviationPct`
 * @param _primaryPrice the primary price source to use
 * @param _referencePrice the reference price to compare primary against
 * @param _oracleDeviationPct the deviation percentage to use for the oracle
 * @return uint256 Primary price if its within deviation range of reference price.
 * = the primary price is reference price is 0.
 * = the reference price if primary price is 0.
 * = reverts if price deviates more than `_oracleDeviationPct`
 */
function deducePrice(uint256 _primaryPrice, uint256 _referencePrice, uint256 _oracleDeviationPct) pure returns (uint256) {
    if (_referencePrice == 0 && _primaryPrice != 0) return _primaryPrice;
    if (_primaryPrice == 0 && _referencePrice != 0) return _referencePrice;
    if (
        (_referencePrice.percentMul(1e4 - _oracleDeviationPct) <= _primaryPrice) &&
        (_referencePrice.percentMul(1e4 + _oracleDeviationPct) >= _primaryPrice)
    ) {
        return _primaryPrice;
    }

    // Revert if price deviates more than `_oracleDeviationPct`
    revert Errors.PRICE_UNSTABLE(_primaryPrice, _referencePrice, _oracleDeviationPct);
}

function pythPrice(bytes32 _id, uint256 _staleTime) view returns (uint256 price_) {
    price_ = normalizePythPriceTo8Decimals(IPyth(cs().pythEp).getPriceNoOlderThan(_id, _staleTime));

    if (price_ == 0 || price_ > type(uint48).max) {
        revert Errors.INVALID_PYTH_PRICE(_id, price_);
    }
}

function normalizePythPriceTo8Decimals(IPyth.Price memory _price) pure returns (uint256) {
    uint256 result = uint64(_price.price);
    uint256 exp = uint32(-_price.exp);
    if (exp > 8) {
        result = result / 10 ** (exp - 8);
    }
    if (exp < 8) {
        result = result * 10 ** (8 - exp);
    }

    return result;
}

/**
 * @notice Gets the price from the provided vault.
 * @dev Vault exchange rate is in 18 decimal precision so we normalize to 8 decimals.
 * @param _vaultAddr The vault address.
 * @return uint256 The price of the vault share in 8 decimal precision.
 */
function vaultPrice(address _vaultAddr) view returns (uint256) {
    return fromWad(IVaultRateProvider(_vaultAddr).exchangeRate(), cs().oracleDecimals);
}

/// @notice Get the price of SDI in USD (WAD precision, so 18 decimals).
function SDIPrice() view returns (uint256) {
    uint256 totalValue = scdp().totalDebtValueAtRatioSCDP(Percents.HUNDRED, false);
    if (totalValue == 0) {
        return 1e18;
    }
    return toWad(totalValue, cs().oracleDecimals).wadDiv(sdi().totalDebt);
}

/**
 * @notice Gets answer from AggregatorV3 type feed.
 * @param _feedAddr The feed address.
 * @param _staleTime Time in seconds for the feed to be considered stale.
 * @return uint256 Parsed answer from the feed, 0 if its stale.
 */
function aggregatorV3Price(address _feedAddr, uint256 _staleTime) view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = IAggregatorV3(_feedAddr).latestRoundData();
    if (answer < 0) {
        revert Errors.NEGATIVE_PRICE(_feedAddr, answer);
    }
    // IMPORTANT: Returning zero when answer is stale, to activate fallback oracle.
    if (block.timestamp - updatedAt > _staleTime) {
        revert Errors.STALE_ORACLE(uint8(Enums.OracleType.Chainlink), _feedAddr, block.timestamp - updatedAt, _staleTime);
    }
    return uint256(answer);
}

/**
 * @notice Gets answer from IAPI3 type feed.
 * @param _feedAddr The feed address.
 * @param _staleTime Staleness threshold.
 * @return uint256 Parsed answer from the feed, 0 if its stale.
 */
function API3Price(address _feedAddr, uint256 _staleTime) view returns (uint256) {
    (int256 answer, uint256 updatedAt) = IAPI3(_feedAddr).read();
    if (answer < 0) {
        revert Errors.NEGATIVE_PRICE(_feedAddr, answer);
    }
    // IMPORTANT: Returning zero when answer is stale, to activate fallback oracle.
    if (block.timestamp - updatedAt > _staleTime) {
        revert Errors.STALE_ORACLE(uint8(Enums.OracleType.API3), _feedAddr, block.timestamp - updatedAt, _staleTime);
    }
    return fromWad(uint256(answer), cs().oracleDecimals); // API3 returns 18 decimals always.
}

/* -------------------------------------------------------------------------- */
/*                                    Util                                    */
/* -------------------------------------------------------------------------- */

/**
 * @notice Gets raw answer info from AggregatorV3 type feed.
 * @param _config Configuration for the oracle.
 * @return RawPrice Unparsed answer with metadata.
 */
function aggregatorV3RawPrice(Oracle memory _config) view returns (RawPrice memory) {
    (, int256 answer, , uint256 updatedAt, ) = IAggregatorV3(_config.feed).latestRoundData();
    bool isStale = block.timestamp - updatedAt > _config.staleTime;
    return RawPrice(answer, updatedAt, _config.staleTime, isStale, answer == 0, Enums.OracleType.Chainlink, _config.feed);
}

/**
 * @notice Gets raw answer info from IAPI3 type feed.
 * @param _config Configuration for the oracle.
 * @return RawPrice Unparsed answer with metadata.
 */
function API3RawPrice(Oracle memory _config) view returns (RawPrice memory) {
    (int256 answer, uint256 updatedAt) = IAPI3(_config.feed).read();
    bool isStale = block.timestamp - updatedAt > _config.staleTime;
    return RawPrice(answer, updatedAt, _config.staleTime, isStale, answer == 0, Enums.OracleType.API3, _config.feed);
}

/**
 * @notice Return raw answer info from the oracles provided
 * @param _oracles Oracles to check.
 * @param _ticker Ticker for the asset.
 * @return RawPrice Unparsed answer with metadata.
 */
function pushPrice(Enums.OracleType[2] memory _oracles, bytes32 _ticker) view returns (RawPrice memory) {
    for (uint256 i; i < _oracles.length; i++) {
        Enums.OracleType oracleType = _oracles[i];
        Oracle storage oracle = cs().oracles[_ticker][_oracles[i]];

        if (oracleType == Enums.OracleType.Chainlink) return aggregatorV3RawPrice(oracle);
        if (oracleType == Enums.OracleType.API3) return API3RawPrice(oracle);
        if (oracleType == Enums.OracleType.Vault) {
            int256 answer = int256(vaultPrice(oracle.feed));
            return RawPrice(answer, block.timestamp, 0, false, answer == 0, Enums.OracleType.Vault, oracle.feed);
        }
    }

    // Revert if no answer is found
    revert Errors.NO_PUSH_ORACLE_SET(_ticker.toString());
}

function viewPrice(bytes32 _ticker, Result memory result) view returns (RawPrice memory) {
    Oracle memory config;

    if (_ticker == bytes32("KISS")) {
        config = cs().oracles[_ticker][Enums.OracleType.Vault];
        int256 answer = int256(vaultPrice(config.feed));
        return RawPrice(answer, block.timestamp, 0, false, answer == 0, Enums.OracleType.Vault, config.feed);
    }

    config = cs().oracles[_ticker][Enums.OracleType.Pyth];

    for (uint256 i; i < result.ids.length; i++) {
        if (result.ids[i] == config.pythId) {
            IPyth.Price memory _price = result.prices[i];
            return
                RawPrice(
                    int256(normalizePythPriceTo8Decimals(_price)),
                    _price.timestamp,
                    config.staleTime,
                    block.timestamp - _price.timestamp > config.staleTime,
                    _price.price == 0,
                    Enums.OracleType.Pyth,
                    address(0)
                );
        }
    }

    revert Errors.NO_VIEW_PRICE_AVAILABLE(_ticker.toString());
}
