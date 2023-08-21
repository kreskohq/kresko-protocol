// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";

import {WadRay} from "common/libs/WadRay.sol";
import {Error} from "common/Errors.sol";

import {scdp, SCDPState, PoolKrAsset} from "scdp/SCDPStorage.sol";
import {LibAmounts} from "./LibAmounts.sol";

import {ms} from "minter/MinterStorage.sol";

/* solhint-disable not-rely-on-time */

/**
 * @author Kresko
 * @title Internal functions for shared collateral pool.
 */
library LibSwap {
    using WadRay for uint256;
    using WadRay for uint128;
    using SafeERC20 for IERC20Permit;

    /**
     * @notice Check that assets can be swapped.
     * @return feePercentage fee percentage for this swap
     */
    function checkAssets(
        SCDPState storage self,
        address _assetIn,
        address _assetOut
    ) internal view returns (uint256 feePercentage, uint256 protocolFee) {
        require(self.isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(self.isEnabled[_assetIn], "asset-in-disabled");
        require(self.isEnabled[_assetOut], "asset-out-disabled");
        require(_assetIn != _assetOut, "same-asset");
        PoolKrAsset memory assetIn = self.poolKrAsset[_assetIn];
        PoolKrAsset memory assetOut = self.poolKrAsset[_assetOut];

        feePercentage = assetOut.openFee + assetIn.closeFee;
        protocolFee = assetIn.protocolFee + assetOut.protocolFee;
    }

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
        uint256 debt = ms().getKreskoAssetAmount(_assetIn, self.debt[_assetIn]);
        valueIn = ms().getKrAssetValue(_assetIn, _amountIn, true); // ignore kFactor here

        uint256 collateralIn; // assets used increase "swap" owned collateral
        uint256 debtOut; // assets used to burn debt

        // Bookkeeping
        if (debt >= _amountIn) {
            // == Debt is equal to or greater than the amount.
            // 1. Burn full amount received.
            debtOut = _amountIn;
            // 2. No increase in collateral.
        } else if (debt < _amountIn) {
            // == Debt is less than the amount received.
            // 1. Burn full debt.
            debtOut = debt;
            // 2. Increase collateral by remainder.
            collateralIn = _amountIn - debt;
        } else {
            // == Debt is 0.
            // 1. Burn nothing.
            // 2. Increase collateral by full amount.
            collateralIn = _amountIn;
        }

        if (collateralIn > 0) {
            uint256 collateralInInternal = LibAmounts.getCollateralAmountWrite(_assetIn, collateralIn);
            // 1. Increase collateral deposits.
            self.totalDeposits[_assetIn] += collateralInInternal;
            // 2. Increase "swap" collateral.
            self.swapDeposits[_assetIn] += collateralInInternal;
        }

        if (debtOut > 0) {
            // 1. Burn debt that was repaid from the assets received.
            self.debt[_assetIn] -= ms().repaySwap(_assetIn, debtOut, _assetsFrom);
        }

        require(_amountIn == debtOut + collateralIn, "assets-in-mismatch");
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
        amountOut = _valueIn.wadDiv(ms().kreskoAssets[_assetOut].uintPrice());
        // Well, should be more than 0.
        require(amountOut > 0, "amount-out-is-zero");

        uint256 swapDeposits = self.getPoolSwapDeposits(_assetOut); // current "swap" collateral

        uint256 collateralOut; // decrease in "swap" collateral
        uint256 debtIn; // new debt required to mint

        // Bookkeeping
        if (swapDeposits == 0) {
            // == No "swap" owned collateral available.
            // 1. Issue full amount as debt.
            debtIn = amountOut;
            // 2. No decrease in collateral.
        } else if (swapDeposits >= amountOut) {
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
            uint256 amountOutInternal = LibAmounts.getCollateralAmountWrite(_assetOut, collateralOut);
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
            self.debt[_assetOut] += ms().mintSwap(_assetOut, debtIn, _assetsTo);
        }

        require(amountOut == debtIn + collateralOut, "amount-out-mismatch");
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
        // Next liquidity index is calculated this way: `((amount / totalLiquidity) + 1) * liquidityIndex`
        // division `amount / totalLiquidity` done in ray for precision
        uint256 result = (_amount.wadToRay().rayDiv(self.getPoolDeposits(_collateralAsset).wadToRay()) + WadRay.RAY)
            .rayMul(self.poolCollateral[_collateralAsset].liquidityIndex);
        self.poolCollateral[_collateralAsset].liquidityIndex = uint128(result);
        return result;
    }
}
