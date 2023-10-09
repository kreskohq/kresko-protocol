// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {IProxy} from "vendor/IProxy.sol";
import {WadRay} from "libs/WadRay.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {PushPrice, Oracle, OracleType} from "common/Types.sol";
import {Percents} from "common/Constants.sol";
import {CError} from "common/CError.sol";
import {Redstone} from "libs/Redstone.sol";
import {cs} from "common/State.sol";
import {scdp, sdi} from "scdp/State.sol";
import {IVaultRateConsumer} from "vault/interfaces/IVaultRateConsumer.sol";

using WadRay for uint256;
using PercentageMath for uint256;
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
    if (prices[0] == 0 && prices[1] == 0) {
        revert CError.ZERO_OR_STALE_PRICE(_assetId.toString());
    }

    // OracleType.Vault uses the same check, reverting if the sequencer is down.
    if (_oracles[0] != OracleType.Vault && !isSequencerUp(cs().sequencerUptimeFeed, cs().sequencerGracePeriodTime)) {
        return handleSequencerDown(_oracles, prices);
    }

    return deducePrice(prices[0], prices[1], _oracleDeviationPct);
}

/**
 * @notice Call the price getter for the oracle provided and return the price.
 * @param _oracleId The oracle id (uint8).
 * @param _assetId The asset id (bytes12).
 * @return uint256 oracle price.
 * This will return 0 if the oracle is not set.
 */
function oraclePrice(OracleType _oracleId, bytes12 _assetId) view returns (uint256) {
    if (_oracleId == OracleType.Empty) return 0;
    if (_oracleId == OracleType.Redstone) return Redstone.getPrice(_assetId);

    Oracle storage oracle = cs().oracles[_assetId][_oracleId];
    return oracle.priceGetter(oracle.feed);
}

/**
 * @notice Return push oracle price.
 * @param _oracles The oracles defined.
 * @param _assetId The asset id (bytes12).
 * @return PushPrice The push oracle price and timestamp.
 */
function pushPrice(OracleType[2] memory _oracles, bytes12 _assetId) view returns (PushPrice memory) {
    for (uint8 i; i < _oracles.length; i++) {
        OracleType oracleType = _oracles[i];
        Oracle storage oracle = cs().oracles[_assetId][_oracles[i]];

        if (oracleType == OracleType.Chainlink) return aggregatorV3PriceWithTimestamp(oracle.feed);
        if (oracleType == OracleType.API3) return API3PriceWithTimestamp(oracle.feed);
        if (oracleType == OracleType.Vault) return PushPrice(vaultPrice(oracle.feed), block.timestamp);
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
    revert CError.PRICE_UNSTABLE(_primaryPrice, _referencePrice);
}

/**
 * @notice Handles the prices in case the sequencer is down.
 * @notice Looks for redstone price, reverting if not available for asset.
 * @param oracles The oracle types.
 * @param prices The fetched oracle prices.
 * @return uint256 Usable price of the asset.
 */
function handleSequencerDown(OracleType[2] memory oracles, uint256[2] memory prices) pure returns (uint256) {
    if (oracles[0] == OracleType.Redstone && prices[0] != 0) {
        return prices[0];
    } else if (oracles[1] == OracleType.Redstone && prices[1] != 0) {
        return prices[1];
    }
    revert CError.SEQUENCER_DOWN_NO_REDSTONE_AVAILABLE();
}

/**
 * @notice Gets the price from the provided vault.
 * @dev Vault exchange rate is in 18 decimal precision so we normalize to 8 decimals.
 * @param _vaultAddr The vault address.
 * @return uint256 The price of the vault share in 8 decimal precision.
 */
function vaultPrice(address _vaultAddr) view returns (uint256) {
    return IVaultRateConsumer(_vaultAddr).exchangeRate() / 1e10;
}

/**
 * @notice Gets answer from AggregatorV3 type feed.
 * @param _feedAddr The feed address.
 * @return uint256 Parsed answer from the feed, 0 if its stale.
 */
function aggregatorV3Price(address _feedAddr, uint256 _oracleTimeout) view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(_feedAddr).latestRoundData();
    if (answer < 0) {
        revert CError.NEGATIVE_PRICE(_feedAddr, answer);
    }
    // returning zero if oracle price is too old so that fallback oracle is used instead.
    if (block.timestamp - updatedAt > _oracleTimeout) {
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
