// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";

import {WadRay} from "../../libs/WadRay.sol";
import {Percentages} from "../../libs/Percentages.sol";
import {AssetConfig, InterestRateMode} from "../InterestRateState.sol";

import {ms} from "../MinterStorage.sol";

library LibInterestRate {
    using WadRay for uint256;
    using WadRay for uint128;
    using Percentages for uint256;
    using Percentages for uint128;
    // using LibInterestRate for AssetConfig;

    /// @dev Ignoring leap years
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    /**
     * @dev Calculates the accumulated debt balance of the user
     * @return The debt balance of the user
     **/
    function getAccumulatedDebt(
        AssetConfig storage config,
        address _user,
        address _asset
    ) internal view returns (uint256) {
        uint256 debt = ms().getKreskoAssetDebt(_user, _asset);

        if (debt == 0) {
            return 0;
        }

        return debt.rayMul(getNormalizedDebtIndex(config));
    }

    /**
     * @dev Updates the reserve indexes and the timestamp of the update
     * @param config of the asset to update indexes for
     **/
    function updateIndexes(AssetConfig storage config) internal returns (uint256, uint256) {
        uint256 newLiquidityIndex = config.liquidityIndex;
        uint256 newDebtIndex = config.debtIndex;

        //only cumulating if there is any income being produced
        if (config.liquidityRate > 0) {
            uint256 cumulatedLiquidityInterest = config.calculateLinearInterest();
            newLiquidityIndex = cumulatedLiquidityInterest.rayMul(config.liquidityIndex);
            require(newLiquidityIndex <= type(uint128).max, "Liq index overflow");

            config.liquidityIndex = uint128(newLiquidityIndex);

            if (IERC20Upgradeable(config.underlyingAsset).totalSupply() != 0) {
                uint256 cumulatedDebtInterest = config.calculateCompoundedInterest(block.timestamp);
                newDebtIndex = cumulatedDebtInterest.rayMul(config.debtIndex);
                require(newDebtIndex <= type(uint128).max, "Debt index overflow");
                config.debtIndex = uint128(newDebtIndex);
            }
        }

        config.lastUpdateTimestamp = uint40(block.timestamp);
        return (newLiquidityIndex, newDebtIndex);
    }

    /**
     * @dev Updates the current borrow rate and the current liquidity rate
     * @param config Configuration
     * @param assetsRepaid The amount of liquidity added to the protocol (deposit or repay) in the previous action
     * @param assetsBorrowed The amount of liquidity taken from the protocol (redeem or borrow)
     **/
    function updateInterestRates(
        AssetConfig storage config,
        uint256 assetsRepaid,
        uint256 assetsBorrowed
    ) internal {
        //calculates the total variable debt locally using the scaled total supply instead
        //of totalSupply(), as it's noticeably cheaper. Also, the index has been
        //updated by the previous updateState() call
        // vars.totalVariableDebt = IVariableDebtToken(reserve.variableDebtTokenAddress)
        //   .scaledTotalSupply()
        //   .rayMul(reserve.variableBorrowIndex);

        (uint256 newLiquidityRate, uint256 newDebtRate) = calculateInterestRates(config, assetsRepaid, assetsBorrowed);

        require(newLiquidityRate <= type(uint128).max, "Liq rate overflow");
        require(newDebtRate <= type(uint128).max, "Debt rate overflow");

        config.liquidityRate = uint128(newLiquidityRate);
        config.debtRate = uint128(newDebtRate);
    }

    function calculateInterestRates(
        AssetConfig storage config,
        uint256 assetsRepaid,
        uint256 assetsBorrowed
    ) internal view returns (uint256, uint256) {
        IKreskoAsset krAsset = IKreskoAsset(config.underlyingAsset);

        uint256 totalDebt = krAsset.totalSupply() - assetsRepaid + assetsBorrowed;

        uint256 currentDebtRate = 0;
        uint256 priceRate = config.optimalPriceRate;
        // priceRate = totalDebt == 0 ? 0 : totalDebt.rayDiv(availableLiquidity.add(totalDebt));

        // Calculate current values
        if (priceRate > config.optimalPriceRate) {
            uint256 excessPriceRateRatio = (priceRate - config.optimalPriceRate.rayDiv(config.excessPriceRate));

            currentDebtRate =
                config.debtRateBase +
                config.rateSlope1 +
                (config.rateSlope2.rayMul(excessPriceRateRatio));
        } else {
            currentDebtRate =
                config.debtRateBase +
                (priceRate.rayMul(config.rateSlope1).rayDiv(config.optimalPriceRate));
        }

        // Get new overall debt rate
        uint256 weightedRate = totalDebt.wadToRay().rayMul(currentDebtRate);
        uint256 currentLiquidityRate = weightedRate.rayDiv(totalDebt.wadToRay()).rayMul(priceRate).percentMul(
            Percentages.PERCENTAGE_FACTOR - config.reserveFactor
        );

        return (currentLiquidityRate, currentDebtRate);
    }

    /**
     * @dev Function to calculate the interest accumulated using a linear interest rate formula
     * @param config for the asset
     * @return The interest rate linearly accumulated during the timeDelta, in ray
     **/

    function calculateLinearInterest(AssetConfig storage config) internal view returns (uint256) {
        uint256 timeDifference = block.timestamp - uint256(config.lastUpdateTimestamp);

        return ((config.liquidityIndex * timeDifference) / SECONDS_PER_YEAR) + WadRay.ray();
    }

    /**
     * @dev Function to calculate the interest using a compounded interest rate formula
     * To avoid expensive exponentiation, the calculation is performed using a binomial approximation:
     *
     *  (1+x)^n = 1+n*x+[n/2*(n-1)]*x^2+[n/6*(n-1)*(n-2)*x^3...
     *
     * The approximation slightly underpays liquidity providers and undercharges borrowers, with the advantage of great gas cost reductions
     * The whitepaper contains reference to the approximation and a table showing the margin of error per different time periods
     *
     * @param config for the asset
     * @param currentTimestamp The timestamp of the last update of the interest
     * @return The interest rate compounded during the timeDelta, in ray
     **/
    function calculateCompoundedInterest(AssetConfig storage config, uint256 currentTimestamp)
        internal
        view
        returns (uint256)
    {
        uint256 exp = currentTimestamp - uint256(config.lastUpdateTimestamp);

        if (exp == 0) {
            return WadRay.ray();
        }

        uint256 expMinusOne = exp - 1;

        uint256 expMinusTwo = exp > 2 ? exp - 2 : 0;

        uint256 ratePerSecond = config.debtRate / SECONDS_PER_YEAR;

        uint256 basePowerTwo = ratePerSecond.rayMul(ratePerSecond);
        uint256 basePowerThree = basePowerTwo.rayMul(ratePerSecond);

        uint256 secondTerm = (exp * expMinusOne * basePowerTwo) / 2;
        uint256 thirdTerm = (exp * expMinusOne * expMinusTwo * basePowerThree) / 6;

        return WadRay.ray() + (ratePerSecond * exp) + secondTerm + thirdTerm;
    }

    // /**
    //  * @dev Accumulates a predefined amount of asset to the reserve as a fixed, instantaneous income. Used for example to accumulate
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
    //  * @dev Calculates the compounded interest between the timestamp of the last update and the current block timestamp
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
     * @param config Asset config
     * @return the normalized deposit income index. expressed in ray
     **/
    function getNormalizedIncomeIndex(AssetConfig storage config) internal view returns (uint256) {
        //solium-disable-next-line
        if (config.lastUpdateTimestamp == uint40(block.timestamp)) {
            //if the index was updated in the same block, no need to perform any calculation
            return config.liquidityIndex;
        }

        return config.calculateLinearInterest().rayMul(config.liquidityIndex);
    }

    /**
     * @dev Returns the ongoing normalized debt index for the borrowers
     * A value of 1e27 means there is no debt. As time passes, the income is accrued
     * A value of 2*1e27 means that for each unit of debt, one unit worth of interest has been accumulated
     * @param config Asset config
     * @return The normalized debt index. expressed in ray
     **/
    function getNormalizedDebtIndex(AssetConfig storage config) internal view returns (uint256) {
        //solium-disable-next-line
        if (config.lastUpdateTimestamp == uint40(block.timestamp)) {
            //if the index was updated in the same block, no need to perform any calculation
            return config.debtIndex;
        }

        return config.calculateCompoundedInterest(block.timestamp).rayMul(config.debtIndex);
    }
}
