// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "./AggregatorV3Interface.sol";
import {Error} from "./Errors.sol";
import {WadRay} from "./libs/WadRay.sol";
import {ms} from "minter/libs/LibMinterBig.sol";

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
 * @notice For a given collateral asset and amount, returns a wad represenatation.
 * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
 *   If decimals > 18, there may be a loss of precision.
 * @param _decimals The collateral asset's number of decimals
 * @param _amount The amount of the collateral asset.
 * @return A fp of amount scaled according to the collateral asset's decimals.
 */
function toWad(uint256 _decimals, uint256 _amount) pure returns (uint256) {
    // Initially, use the amount as the raw value for the fixed point.
    // which internally uses 18 decimals.
    // Most collateral assets will have 18 decimals.

    // Handle cases where the collateral asset's decimal amount is not 18.
    if (_decimals < 18) {
        // If the decimals are less than 18, multiply the amount
        // to get the correct wad value.
        // E.g. 1 full token of a 17 decimal token will  cause the
        // initial setting of amount to be 0.1, so we multiply
        // by 10 ** (18 - 17) = 10 to get it to 0.1 * 10 = 1.
        return _amount * (10 ** (18 - _decimals));
    } else if (_decimals > 18) {
        // If the decimals are greater than 18, divide the amount
        // to get the correct fixed point value.
        // Note because wad numbers are 18 decimals, this results
        // in loss of precision. E.g. if the collateral asset has 19
        // decimals and the deposit amount is only 1 uint, this will divide
        // 1 by 10 ** (19 - 18), resulting in 1 / 10 = 0
        return _amount / (10 ** (_decimals - 18));
    }
    return _amount;
}

/**
 * @notice For a given collateral asset and wad amount, returns the collateral amount.
 * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
 *   If decimals < 18, there may be a loss of precision.
 * @param _decimals The collateral asset's number of decimals
 * @param _wadAmount The wad amount of the collateral asset.
 * @return An amount that is compatible with the collateral asset's decimals.
 */
function fromWad(uint256 _decimals, uint256 _wadAmount) pure returns (uint256) {
    // Initially, use the rawValue, which internally uses 18 decimals.
    // Most collateral assets will have 18 decimals.
    // Handle cases where the collateral asset's decimal amount is not 18.
    if (_decimals < 18) {
        // If the decimals are less than 18, divide the depositAmount
        // to get the correct collateral amount.
        // E.g. 1 full token will result in amount being 1e18 at this point,
        // so if the token has 17 decimals, divide by 10 ** (18 - 17) = 10
        // to get a value of 1e17.
        // This may result in a loss of precision.
        return _wadAmount / (10 ** (18 - _decimals));
    } else if (_decimals > 18) {
        // If the decimals are greater than 18, multiply the depositAmount
        // to get the correct fixed point value.
        // E.g. 1 full token will result in amount being 1e18 at this point,
        // so if the token has 19 decimals, multiply by 10 ** (19 - 18) = 10
        // to get a value of 1e19.
        return _wadAmount * (10 ** (_decimals - 18));
    }
    return _wadAmount;
}
