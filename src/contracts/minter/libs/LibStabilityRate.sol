// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {Percentages} from "../../libs/Percentages.sol";
import {LibKrAsset} from "../libs/LibKrAsset.sol";

import {SRateAsset} from "../InterestRateState.sol";
import {ms} from "../MinterStorage.sol";
import "hardhat/console.sol";

/* solhint-disable not-rely-on-time */

library LibStabilityRate {
    using WadRay for uint256;
    using WadRay for uint128;
    using Percentages for uint256;
    using Percentages for uint128;
    using FixedPoint for FixedPoint.Unsigned;

    /// @dev Ignoring leap years
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    /**
     * @dev Updates the reserve indexes and the timestamp of the update
     * @param asset rate configuration for the asset
     **/
    function updateSRIndexes(SRateAsset storage asset) internal returns (uint256, uint256) {
        uint256 newLiquidityIndex = asset.liquidityIndex;
        uint256 newDebtIndex = asset.debtIndex;

        // only cumulating if there is any income being produced
        if (asset.liquidityRate > 0) {
            uint256 cumulatedLiquidityInterest = asset.calculateLinearInterest();
            newLiquidityIndex = cumulatedLiquidityInterest.rayMul(asset.liquidityIndex);
            require(newLiquidityIndex <= type(uint128).max, "Liq index overflow");

            asset.liquidityIndex = uint128(newLiquidityIndex);

            if (IERC20Upgradeable(asset.asset).totalSupply() != 0) {
                uint256 cumulatedDebtInterest = asset.calculateCompoundedInterest(block.timestamp);
                newDebtIndex = cumulatedDebtInterest.rayMul(asset.debtIndex);
                require(newDebtIndex <= type(uint128).max, "Debt index overflow");
                asset.debtIndex = uint128(newDebtIndex);
            }
        }

        asset.lastUpdateTimestamp = uint40(block.timestamp);
        return (newLiquidityIndex, newDebtIndex);
    }

    /**
     * @dev Updates the current borrow rate and the current liquidity rate
     * @param asset rate configuration for the asset
     **/
    function updateSRates(SRateAsset storage asset) internal {
        (uint256 newLiquidityRate, uint256 newDebtRate) = calculateStabilityRates(asset);

        require(newLiquidityRate <= type(uint128).max, "Liq rate overflow");
        require(newDebtRate <= type(uint128).max, "Debt rate overflow");

        asset.liquidityRate = uint128(newLiquidityRate);
        asset.debtRate = uint128(newDebtRate);
    }

    function getPriceRate(SRateAsset storage asset) internal view returns (uint256) {
        FixedPoint.Unsigned memory oraclePrice = ms().getKrAssetValue(asset.asset, 1 ether, true);
        FixedPoint.Unsigned memory ammPrice = ms().getKrAssetAMMPrice(asset.asset, 1 ether);

        // no pair, no effect
        if (ammPrice.rawValue == 0) {
            return 1 ether;
        }
        return ammPrice.div(oraclePrice).div(10).rawValue;
    }

    function calculateStabilityRates(SRateAsset storage asset) internal view returns (uint256, uint256) {
        IKreskoAsset krAsset = IKreskoAsset(asset.asset);

        uint256 currentDebtRate = 0;
        uint256 priceRate = asset.getPriceRate();
        // priceRate = totalDebt == 0 ? 0 : totalDebt.rayDiv(availableLiquidity.add(totalDebt));

        // If premium is high
        if (priceRate > asset.optimalPriceRate + asset.excessPriceRateDelta) {
            uint256 excessRate = priceRate - asset.optimalPriceRate;
            currentDebtRate =
                asset.debtRateBase.rayDiv(priceRate.percentMul(125e2)) +
                ((asset.optimalPriceRate - excessRate).rayMul(asset.rateSlope1));
            // If premium is low
        } else if (priceRate < asset.optimalPriceRate - asset.excessPriceRateDelta) {
            uint256 multiplier = (asset.optimalPriceRate - priceRate).rayDiv(asset.excessPriceRateDelta);
            currentDebtRate =
                (asset.debtRateBase + asset.rateSlope1) +
                asset.optimalPriceRate.rayMul(multiplier).rayMul(asset.rateSlope2);
            // If premium is within optimal range
        } else {
            currentDebtRate = asset.debtRateBase + (priceRate.rayMul(asset.rateSlope1));
        }

        uint256 totalDebt = krAsset.totalSupply().wadToRay();
        // Get new overall debt rate
        uint256 weightedRate = totalDebt.rayMul(currentDebtRate);
        uint256 currentLiquidityRate = weightedRate.rayDiv(totalDebt).rayMul(priceRate);
        // uint256 currentLiquidityRate = weightedRate.rayDiv(totalDebt.wadToRay()).rayMul(priceRate).percentMul(
        //     Percentages.PERCENTAGE_FACTOR - asset.reserveFactor
        // );

        return (currentLiquidityRate, currentDebtRate);
    }

    /**
     * @dev Function to calculate the interest accumulated using a linear interest rate formula
     * @param asset rate configuration for the asset
     * @return The interest rate linearly accumulated during the timeDelta, in ray
     **/

    function calculateLinearInterest(SRateAsset storage asset) internal view returns (uint256) {
        uint256 timeDifference = block.timestamp - uint256(asset.lastUpdateTimestamp);

        return ((asset.liquidityRate * timeDifference) / SECONDS_PER_YEAR) + WadRay.RAY;
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
    function calculateCompoundedInterest(SRateAsset storage asset, uint256 currentTimestamp)
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

            basePowerTwo = asset.debtRate.rayMul(asset.debtRate) / (SECONDS_PER_YEAR * SECONDS_PER_YEAR);
            basePowerThree = basePowerTwo.rayMul(asset.debtRate) / SECONDS_PER_YEAR;
        }

        uint256 secondTerm = exp * expMinusOne * basePowerTwo;
        unchecked {
            secondTerm /= 2;
        }
        uint256 thirdTerm = exp * expMinusOne * expMinusTwo * basePowerThree;
        unchecked {
            thirdTerm /= 6;
        }

        return WadRay.RAY + (asset.debtRate * exp) / SECONDS_PER_YEAR + secondTerm + thirdTerm;
    }

    // /**
    //  * @dev Accumulates a predefined amount of asset to the reserve as a fixed, instantaneous income.
    // Used for example to accumulate
    //  * the flashloan fee to the reserve, and spread it between all the depositors
    //  * @param reserve The reserve object
    //  * @param totalLiquidity The total liquidity available in the reserve
    //  * @param amount The amount to accomulate
    //  **/
    // function cumulateToLiquidityIndex(
    //     DataTypes.ReserveData storage reserve,
    //     uint256 totalLiquidity,
    //     uint256 amount
    // ) internal {
    //     uint256 amountToLiquidityRatio = amount.wadToRay().rayDiv(totalLiquidity.wadToRay());

    //     uint256 result = amountToLiquidityRatio.add(WadRayMath.ray());

    //     result = result.rayMul(reserve.liquidityIndex);
    //     require(result <= type(uint128).max, Errors.RL_LIQUIDITY_INDEX_OVERFLOW);

    //     reserve.liquidityIndex = uint128(result);
    // }

    // /**
    //  * @dev Calculates the compounded interest between the timestamp of the last update and
    // the current block timestamp
    //  * @param rate The interest rate (in ray)
    //  * @param lastUpdateTimestamp The timestamp from which the interest accumulation needs to be calculated
    //  **/
    // function calculateCompoundedInterest(uint256 rate, uint40 lastUpdateTimestamp) internal view returns (uint256) {
    //     return calculateCompoundedInterest(rate, lastUpdateTimestamp, block.timestamp);
    // }

    /**
     * @dev Returns the ongoing normalized income index for the depositors
     * A value of 1e27 means there is no income. As time passes, the income is accrued
     * A value of 2*1e27 means for each unit of asset one unit of income has been accrued
     * @param asset rate configuration for the asset
     * @return the normalized deposit income index. expressed in ray
     **/
    function getNormalizedIncomeIndex(SRateAsset storage asset) internal view returns (uint256) {
        //solium-disable-next-line
        if (asset.lastUpdateTimestamp == uint40(block.timestamp)) {
            //if the index was updated in the same block, no need to perform any calculation
            return asset.liquidityIndex;
        }

        return asset.calculateLinearInterest().rayMul(asset.liquidityIndex);
    }

    /**
     * @dev Returns the ongoing normalized debt index for the borrowers
     * A value of 1e27 means there is no debt. As time passes, the income is accrued
     * A value of 2*1e27 means that for each unit of debt, one unit worth of interest has been accumulated
     * @param asset rate configuration for the asset
     * @return The normalized debt index. expressed in ray
     **/
    function getNormalizedDebtIndex(SRateAsset storage asset) internal view returns (uint256) {
        //solium-disable-next-line
        if (asset.lastUpdateTimestamp == uint40(block.timestamp)) {
            //if the index was updated in the same block, no need to perform any calculation
            return asset.debtIndex;
        }

        return asset.calculateCompoundedInterest(block.timestamp).rayMul(asset.debtIndex);
    }
}
