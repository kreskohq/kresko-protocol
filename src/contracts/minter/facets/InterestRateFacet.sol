// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {WadRay} from "../../libs/WadRay.sol";
import {LibInterestRate} from "../libs/LibInterestRate.sol";
import {AssetConfig, InterestRateMode} from "../InterestRateState.sol";
import {ms} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";

/**
 * @title VariableDebtToken
 * @notice Implements a variable debt token to track the borrowing positions of users
 * at variable rate mode
 * @author Aave
 **/
contract InterestRateFacet {
    using WadRay for uint256;
    using LibInterestRate for AssetConfig;

    function getNormalizedDebtIndex(address asset) external view returns (uint256) {
        return irs().configs[asset].getNormalizedDebtIndex();
    }

    function configure(address asset) external {
        // mode = InterestRateMode.AMM;
        irs().configs[asset] = AssetConfig({
            liquidityIndex: uint128(WadRay.ray()),
            debtIndex: uint128(WadRay.ray()),
            debtRateBase: uint128(WadRay.ray()),
            lastUpdateTimestamp: uint40(block.timestamp),
            underlyingAsset: asset,
            reserveFactor: uint128(0),
            rateSlope1: uint128(WadRay.ray() * 1),
            rateSlope2: uint128(WadRay.ray() * 20),
            optimalPriceRate: uint128(WadRay.ray() * 40),
            excessPriceRate: uint128(WadRay.ray() * 50),
            debtRate: uint128(WadRay.ray()),
            liquidityRate: uint128(WadRay.ray())
        });
    }

    // /**
    //  * @dev Calculates the accumulated debt balance of the user
    //  * @return The debt balance of the user
    //  **/
    // function accumulatedDebt(address _user, address _asset) external view returns (uint256) {
    //     return irs().configs[_asset].getAccumulatedDebt(_user, _asset);
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
