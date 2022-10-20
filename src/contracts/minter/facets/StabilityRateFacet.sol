// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {WadRay} from "../../libs/WadRay.sol";
import {LibStabilityRate} from "../libs/LibStabilityRate.sol";
import {SRateAsset} from "../InterestRateState.sol";
import {ms} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";
import {DiamondModifiers} from "../../shared/Modifiers.sol";
import "hardhat/console.sol";

contract StabilityRateFacet is DiamondModifiers {
    using WadRay for uint256;
    using LibStabilityRate for SRateAsset;

    struct SRateConfig {
        uint128 debtRateBase;
        uint128 reserveFactor;
        uint128 rateSlope1;
        uint128 rateSlope2;
        uint128 optimalPriceRate;
        uint128 excessPriceRateDelta;
    }

    function getCalculatedSRates(address _asset) external view returns (uint256, uint256) {
        return irs().srAssets[_asset].calculateStabilityRates();
    }

    function getPriceRate(address _asset) external view returns (uint256) {
        return irs().srAssets[_asset].getPriceRate();
    }

    function getSRateIndex(address _asset) external view returns (uint256) {
        return irs().srAssets[_asset].getNormalizedDebtIndex();
    }

    function updateSRates(address _asset) external {
        irs().srAssets[_asset].updateSRIndexes();
        irs().srAssets[_asset].updateSRates();
    }

    function initSRateAsset(address _asset, SRateConfig memory _config) external onlyOwner {
        require(irs().srAssets[_asset].asset == address(0), "Stability rates already initialized");
        require(WadRay.RAY >= _config.optimalPriceRate, "Invalid optimal rate");
        require(WadRay.RAY >= _config.excessPriceRateDelta, "Invalid excess rate");

        irs().srAssets[_asset] = SRateAsset({
            liquidityIndex: uint128(WadRay.RAY),
            debtIndex: uint128(WadRay.RAY),
            debtRateBase: _config.debtRateBase,
            // solhint-disable not-rely-on-time
            lastUpdateTimestamp: uint40(block.timestamp),
            asset: _asset,
            reserveFactor: _config.reserveFactor,
            rateSlope1: _config.rateSlope1,
            rateSlope2: _config.rateSlope2,
            optimalPriceRate: _config.optimalPriceRate,
            excessPriceRateDelta: _config.excessPriceRateDelta,
            debtRate: uint128(WadRay.RAY),
            liquidityRate: uint128(WadRay.RAY)
        });
    }

    function configureSRateAsset(address _asset, SRateConfig memory _config) external onlyOwner {
        require(irs().srAssets[_asset].asset == _asset, "Stability rates not initialized");
        require(WadRay.RAY >= _config.optimalPriceRate, "Invalid optimal rate");
        require(WadRay.RAY >= _config.excessPriceRateDelta, "Invalid excess rate");
        irs().srAssets[_asset].reserveFactor = _config.reserveFactor;
        irs().srAssets[_asset].rateSlope1 = _config.rateSlope1;
        irs().srAssets[_asset].rateSlope2 = _config.rateSlope2;
        irs().srAssets[_asset].optimalPriceRate = _config.optimalPriceRate;
        irs().srAssets[_asset].excessPriceRateDelta = _config.excessPriceRateDelta;
    }

    function getSRateAssetConfiguration(address _asset) external view returns (SRateAsset memory) {
        return irs().srAssets[_asset];
    }

    function getTotalStabilityFeeAccrued(address _asset) external view returns (uint256) {
        uint256 totalSupply = IERC20Upgradeable(_asset).totalSupply();
        return totalSupply.rayMul(irs().srAssets[_asset].getNormalizedDebtIndex()) - totalSupply;
    }

    // /**
    //  * @dev Calculates the accumulated debt balance of the user
    //  * @return The debt balance of the user
    //  **/
    // function accumulatedDebt(address _user, address _asset) external view returns (uint256) {
    //     return irs().sRates[_asset].getAccumulatedDebt(_user, _asset);
    // }

    // /**
    //  * @dev Mints debt token to the `onBehalfOf` address
    //  * -  Only callable by the LendingPool
    //  * @param user The address receiving the borrowed underlying, being the delegatee in case
    //  * of credit delegate, or same as `onBehalfOf` otherwise
    //  * @param onBehalfOf The address receiving the debt tokens
    //  * @param amount The amount of debt being minted
    //  * @return `true` if the the previous balance of the user is 0
    //  **/
    // function mint(
    //     address user,
    //     address onBehalfOf,
    //     uint256 amount
    // ) external returns (bool) {
    //     if (user != onBehalfOf) {
    //         // TODO: REVISIT BORROW ALLOWANCE
    //         // _decreaseBorrowAllowance(onBehalfOf, user, amount);
    //     }

    // config.updateIndexes(scaledTotalSupply());

    // uint256 previousBalance = super.balanceOf(onBehalfOf);
    // uint256 amountScaled = amount.rayDiv(config.debtIndex);
    // require(amountScaled != 0, "Invalid mint amount");

    // _mint(onBehalfOf, amountScaled);
    // config.updateInterestRates(0, amount);

    // emit Transfer(address(0), onBehalfOf, amount);
    // emit Mint(user, onBehalfOf, amount, index);

    //     return amount == 0;
    // }

    // /**
    //  * @dev Burns user variable debt
    //  * - Only callable by the LendingPool
    //  * @param user The user whose debt is getting burned
    //  * @param amount The amount getting burned
    //  * @param index The variable debt index of the reserve
    //  **/
    // function burn(
    //     address user,
    //     uint256 amount,
    //     uint256 index
    // ) external {
    //     uint256 amountScaled = amount.rayDiv(index);
    //     require(amountScaled != 0, "Invalid burn");

    //     // _burn(user, amountScaled);

    //     // emit Transfer(user, address(0), amount);
    //     // emit Burn(user, amount, index);
    // }

    // /**
    //  * @dev Returns the principal debt balance of the user from
    //  * @return The debt balance of the user since the last burn/mint action
    //  **/
    // function scaledBalanceOf(address user) public view virtual returns (uint256) {
    //     return super.balanceOf(user);
    // }

    // /**
    //  * @dev Returns the total supply of the variable debt token. Represents the total debt accrued by the users
    //  * @return The total supply
    //  **/
    // function totalSupply() public view virtual override returns (uint256) {
    //     return super.totalSupply().rayMul(config.getNormalizedDebtIndex());
    // }

    // /**
    //  * @dev Returns the scaled total supply of the variable debt token. Represents sum(debt/index)
    //  * @return the scaled total supply
    //  **/
    // function scaledTotalSupply() public view virtual returns (uint256) {
    //     return super.totalSupply();
    // }

    // /**
    //  * @dev Returns the principal balance of the user and principal total supply.
    //  * @param user The address of the user
    //  * @return The principal balance of the user
    //  * @return The principal total supply
    //  **/
    // function getScaledUserBalanceAndSupply(address user) external view returns (uint256, uint256) {
    //     return (super.balanceOf(user), super.totalSupply());
    // }

    // function getMaxBorrowRate() external view returns (uint256) {
    //     return config.debtRateBase + config.rateSlope1 + config.rateSlope2;
    // }

    // function getInterestRates() external view returns (uint256, uint256) {
    //     return config.calculateInterestRates(0, 0);
    // }
}
