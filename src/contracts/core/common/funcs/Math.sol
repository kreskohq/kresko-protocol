// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {MaxLiqVars} from "common/Types.sol";
import {Asset} from "common/Types.sol";
using WadRay for uint256;
using PercentageMath for uint256;
using PercentageMath for uint16;
using PercentageMath for uint32;

/* -------------------------------------------------------------------------- */
/*                                Liquidations                                */
/* -------------------------------------------------------------------------- */

/**
 * @notice Calculates the maximum USD value of a given kreskoAsset that can be liquidated given a liquidation pair
 * Calculates the value gained per USD repaid in liquidation for a given kreskoAsset
 * debtFactor = debtFactor = k * LT / cFactor;
 * valPerUSD = (DebtFactor - Asset closeFee - liqIncentive) / DebtFactor
 *
 * Calculates the maximum amount of USD value that can be liquidated given the account's collateral value
 * maxLiquidatableUSD = (MCV - ACV) / valPerUSD / debtFactor / cFactor * LOM
 * @dev This function is used by getMaxLiquidation and is factored out for readability
 * @param vars liquidation variables which includes above symbols
 */
function calcMaxLiqValue(MaxLiqVars memory vars) pure returns (uint256) {
    return
        (vars.minCollateralValue - vars.accountCollateralValue)
            .percentDiv(vars.gainFactor)
            .percentDiv(vars.debtFactor)
            .percentDiv(vars.collateral.factor);
}

/* -------------------------------------------------------------------------- */
/*                                   General                                  */
/* -------------------------------------------------------------------------- */

/**
 * @notice Calculate amount for value provided with possible incentive multiplier for value.
 * @param _incentiveMultiplier The incentive multiplier (>= 1e18).
 * @param _price The price in USD for the output asset.
 * @param _repayValue Value to be converted to amount.
 */
function valueToAmount(uint16 _incentiveMultiplier, uint256 _price, uint256 _repayValue) pure returns (uint256) {
    // Seize amount = (repay amount USD * liquidation incentive / collateral price USD).
    // Denominate seize amount in collateral type
    // Apply liquidation incentive multiplier
    return _repayValue.percentMul(_incentiveMultiplier).wadDiv(_price);
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
