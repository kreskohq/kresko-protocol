// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {mintSCDP, burnSCDP} from "common/funcs/Actions.sol";
import {krAssetAmountToValue, krAssetValueToAmount, kreskoAssetAmount, collateralAmountWrite} from "minter/funcs/Conversions.sol";
import {SCDPState} from "scdp/State.sol";

library Swap {
    using WadRay for uint256;
    using SafeERC20Permit for IERC20Permit;

    /**
     * @notice Records the assets received from account in a swap.
     * Burning any existing shared debt or increasing collateral deposits.
     * @param _assetIn The asset received.
     * @param _amountIn The amount of the asset received.
     * @param _assetsFrom The account that holds the assets to burn.
     * @return valueIn The value of the assets received into the protocol, used to calculate assets out.
     */
    function handleAssetsIn(
        SCDPState storage self,
        address _assetIn,
        uint256 _amountIn,
        address _assetsFrom
    ) internal returns (uint256 valueIn) {
        uint256 debt = kreskoAssetAmount(_assetIn, self.debt[_assetIn]);
        valueIn = krAssetAmountToValue(_assetIn, _amountIn, true); // ignore kFactor here

        uint256 collateralIn; // assets used increase "swap" owned collateral
        uint256 debtOut; // assets used to burn debt

        // Bookkeeping
        if (debt >= _amountIn) {
            // == Debt is greater than the amount.
            // 1. Burn full amount received.
            debtOut = _amountIn;
            // 2. No increase in collateral.
        } else {
            // == Debt is less than the amount received.
            // 1. Burn full debt.
            debtOut = debt;
            // 2. Increase collateral by remainder.
            collateralIn = _amountIn - debt;
        }
        // else {
        //     // == Debt is 0.
        //     // 1. Burn nothing.
        //     // 2. Increase collateral by full amount.
        //     collateralIn = _amountIn;
        // }

        if (collateralIn > 0) {
            uint256 collateralInWrite = collateralAmountWrite(_assetIn, collateralIn);
            // 1. Increase collateral deposits.
            self.totalDeposits[_assetIn] += collateralInWrite;
            // 2. Increase "swap" collateral.
            self.swapDeposits[_assetIn] += collateralInWrite;
        }

        if (debtOut > 0) {
            // 1. Burn debt that was repaid from the assets received.
            self.debt[_assetIn] -= burnSCDP(_assetIn, debtOut, _assetsFrom);
        }

        assert(_amountIn == debtOut + collateralIn);
    }

    /**
     * @notice Records the assets to send out in a swap.
     * Increasing debt of the pool by minting new assets when required.
     * @param _assetOut The asset to send out.
     * @param _valueIn The value received in.
     * @param _assetsTo The asset receiver.
     * @return amountOut The amount of the asset out.
     */
    function handleAssetsOut(
        SCDPState storage self,
        address _assetOut,
        uint256 _valueIn,
        address _assetsTo
    ) internal returns (uint256 amountOut) {
        // Calculate amount to send out from value received in.
        amountOut = krAssetValueToAmount(_assetOut, _valueIn, true);
        // Well, should be more than 0.
        require(amountOut > 0, "amount-out-is-zero");

        uint256 swapDeposits = self.swapDepositAmount(_assetOut); // current "swap" collateral

        uint256 collateralOut; // decrease in "swap" collateral
        uint256 debtIn; // new debt required to mint

        // Bookkeeping
        if (swapDeposits >= amountOut) {
            // == "Swap" owned collateral exceeds requested amount
            // 1. No debt issued.
            // 2. Decrease collateral by full amount.
            collateralOut = amountOut;
        } else {
            // == "Swap" owned collateral is less than requested amount.
            // 1. Issue debt for remainder.
            debtIn = amountOut - swapDeposits;
            // 2. Reduce "swap" owned collateral to zero.
            collateralOut = swapDeposits;
        }

        if (collateralOut > 0) {
            uint256 amountOutInternal = collateralAmountWrite(_assetOut, collateralOut);
            // 1. Decrease collateral deposits.
            self.totalDeposits[_assetOut] -= amountOutInternal;
            // 2. Decrease "swap" owned collateral.
            self.swapDeposits[_assetOut] -= amountOutInternal;
            if (_assetsTo != address(this)) {
                // 3. Transfer collateral to receiver if it is not this contract.
                IERC20Permit(_assetOut).safeTransfer(_assetsTo, collateralOut);
            }
        }

        if (debtIn > 0) {
            // 1. Issue required debt to the pool, minting new assets to receiver.
            self.debt[_assetOut] += mintSCDP(_assetOut, debtIn, _assetsTo);
        }

        assert(amountOut == debtIn + collateralOut);
    }

    /**
     * @notice Accumulates fees to deposits as a fixed, instantaneous income.
     * @param _collateralAsset asset
     * @param _amount amount to accumulate
     * @return nextLiquidityIndex The next liquidity index of the reserve
     */
    function cumulateIncome(
        SCDPState storage self,
        address _collateralAsset,
        uint256 _amount
    ) internal returns (uint256 nextLiquidityIndex) {
        require(_amount != 0, "amount-zero");
        uint256 poolDeposits = self.totalDepositAmount(_collateralAsset);
        require(poolDeposits != 0, "no-deposits");
        // liquidity index increment is calculated this way: `(amount / totalLiquidity)`
        // division `amount / totalLiquidity` done in ray for precision

        return (self.collateral[_collateralAsset].liquidityIndex += uint128(
            (_amount.wadToRay().rayDiv(poolDeposits.wadToRay()))
        ));
    }
}
