// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {Error} from "../../libs/Errors.sol";
import {Percentages} from "../../libs/Percentages.sol";
import {LibKrAsset} from "../libs/LibKrAsset.sol";

import {StabilityRateConfig} from "../InterestRateState.sol";
import {ms} from "../MinterStorage.sol";
import "hardhat/console.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title AMM price stability rate library, derived from Aave Protocols VariableDebtToken calculations
 * @notice Library for performing stability rate related operations
 */
library LibStabilityRate {
    using WadRay for uint256;
    using WadRay for uint128;
    using Percentages for uint256;
    using FixedPoint for FixedPoint.Unsigned;

    /// @dev Ignoring leap years
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    /**
     * @notice Cumulates the stability rate from previous update and multiplies the debt index with it.
     * @dev Updates the updated timestamp
     * @dev New debt index cannot overflow uint128
     * @param asset configuration for the asset
     * @return newDebtIndex the updated index
     */
    function updateDebtIndex(StabilityRateConfig storage asset) internal returns (uint256 newDebtIndex) {
        if (asset.asset == address(0)) return WadRay.RAY;

        newDebtIndex = asset.debtIndex;
        // only cumulating if there is any assets minted and rate is over 0
        if (IERC20Upgradeable(asset.asset).totalSupply() != 0) {
            uint256 cumulatedStabilityRate = asset.calculateCompoundedInterest(block.timestamp);
            newDebtIndex = cumulatedStabilityRate.rayMul(asset.debtIndex);
            require(newDebtIndex <= type(uint128).max, Error.DEBT_INDEX_OVERFLOW);
            asset.debtIndex = uint128(newDebtIndex);
        }

        asset.lastUpdateTimestamp = uint40(block.timestamp);
        return newDebtIndex;
    }

    /**
     * @notice Updates the current stability rate for an asset
     * @dev New stability rate cannot overflow uint128
     * @param asset rate configuration for the asset
     */
    function updateStabilityRate(StabilityRateConfig storage asset) internal {
        if (asset.asset == address(0)) return;

        uint256 stabilityRate = calculateStabilityRate(asset);
        require(stabilityRate <= type(uint128).max, Error.STABILITY_RATE_OVERFLOW);
        asset.stabilityRate = uint128(stabilityRate);
    }

    /**
     * @notice Get the current price rate between AMM and oracle pricing
     * @dev Raw return value of ammPrice == 0 when no AMM pair exists OR liquidity of the pair does not qualify
     * @param asset rate configuration for the asset
     * @return priceRate the current price rate
     */
    function getPriceRate(StabilityRateConfig storage asset) internal view returns (uint256 priceRate) {
        FixedPoint.Unsigned memory oraclePrice = ms().getKrAssetValue(asset.asset, 1 ether, true);
        FixedPoint.Unsigned memory ammPrice = ms().getKrAssetAMMPrice(asset.asset, 1 ether);
        // no pair, no effect
        if (ammPrice.rawValue == 0) {
            return 0;
        }
        return ammPrice.div(oraclePrice).div(10).rawValue;
    }

    /**
     * @notice Calculate new stability rate from the current price rate
     * @dev Separate calculations exist for following cases:
     * case 1: AMM premium > optimal + delta
     * case 2: AMM premium < optimal - delta
     * case 3: AMM premium <= optimal + delta && AMM premium >= optimal - delta
     * @param asset rate configuration for the asset
     * @return stabilityRate the current stability rate
     */
    function calculateStabilityRate(StabilityRateConfig storage asset) internal view returns (uint256 stabilityRate) {
        uint256 priceRate = asset.getPriceRate(); // 0.95 RAY = -5% PREMIUM, 1.05 RAY = +5% PREMIUM

        // Return base rate if no AMM price exists
        if (priceRate == 0) {
            return asset.stabilityRateBase;
        }
        // If AMM price > priceRate + delta, eg. AMM price is higher than oracle price
        if (priceRate > asset.optimalPriceRate + asset.priceRateDelta) {
            uint256 excessRate = priceRate - WadRay.RAY;
            stabilityRate =
                asset.stabilityRateBase.rayDiv(priceRate.percentMul(125e2)) +
                ((WadRay.RAY - excessRate).rayMul(asset.rateSlope1));
            // If AMM price < pricaRate + delta, AMM price is lower than oracle price
        } else if (priceRate < asset.optimalPriceRate - asset.priceRateDelta) {
            uint256 multiplier = (WadRay.RAY - priceRate).rayDiv(asset.priceRateDelta);
            stabilityRate =
                (asset.stabilityRateBase + asset.rateSlope1) +
                WadRay.RAY.rayMul(multiplier).rayMul(asset.rateSlope2);
            // Default case, AMM price is within optimal range of oracle price
        } else {
            stabilityRate = asset.stabilityRateBase + (priceRate.rayMul(asset.rateSlope1));
        }
    }

    /**
     * @dev Function to calculate the interest using a compounded interest rate formula
     * To avoid expensive exponentiation, the calculation is performed using a binomial approximation:
     *
     *  (1+x)^n = 1+n*x+[n/2*(n-1)]*x^2+[n/6*(n-1)*(n-2)*x^3...
     *
     * The approximation slightly underpays liquidity providers and undercharges borrowers
     * with the advantage of great gas cost reductions
     * The Aave whitepaper contains reference to the approximation
     * with a table showing the margin of error per different time periods
     *
     * @param asset rate configuration for the asset
     * @param currentTimestamp The timestamp of the last update of the interest
     * @return The interest rate compounded during the timeDelta, in ray
     **/
    function calculateCompoundedInterest(StabilityRateConfig storage asset, uint256 currentTimestamp)
        internal
        view
        returns (uint256)
    {
        //solium-disable-next-line
        uint256 exp = currentTimestamp - uint256(asset.lastUpdateTimestamp);

        if (exp == 0) {
            return WadRay.RAY;
        }

        uint256 expMinusOne;
        uint256 expMinusTwo;
        uint256 basePowerTwo;
        uint256 basePowerThree;
        unchecked {
            expMinusOne = exp - 1;

            expMinusTwo = exp > 2 ? exp - 2 : 0;

            basePowerTwo = asset.stabilityRate.rayMul(asset.stabilityRate) / (SECONDS_PER_YEAR * SECONDS_PER_YEAR);
            basePowerThree = basePowerTwo.rayMul(asset.stabilityRate) / SECONDS_PER_YEAR;
        }

        uint256 secondTerm = exp * expMinusOne * basePowerTwo;
        unchecked {
            secondTerm /= 2;
        }
        uint256 thirdTerm = exp * expMinusOne * expMinusTwo * basePowerThree;
        unchecked {
            thirdTerm /= 6;
        }

        return WadRay.RAY + (asset.stabilityRate * exp) / SECONDS_PER_YEAR + secondTerm + thirdTerm;
    }

    /**
     * @dev Returns the ongoing normalized debt index for the borrowers
     * A value of 1e27 means there is no interest. As time passes, the interest is accrued
     * A value of 2*1e27 means that for each unit of debt, one unit worth of interest has been accumulated
     * @param asset rate configuration for the asset
     * @return The normalized debt index. expressed in ray
     **/
    function getNormalizedDebtIndex(StabilityRateConfig storage asset) internal view returns (uint256) {
        if (asset.asset == address(0)) return WadRay.RAY;
        //solium-disable-next-line
        if (asset.lastUpdateTimestamp == uint40(block.timestamp)) {
            //if the index was updated in the same block, no need to perform any calculation
            return asset.debtIndex;
        }

        return asset.calculateCompoundedInterest(block.timestamp).rayMul(asset.debtIndex);
    }
}
