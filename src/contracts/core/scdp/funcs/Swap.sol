// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {mintSCDP, burnSCDP} from "common/funcs/Actions.sol";
import {Asset} from "common/Types.sol";

import {CError} from "common/CError.sol";
import {SCDPState} from "scdp/State.sol";
import {SCDPAssetData} from "scdp/Types.sol";

library Swap {
    using WadRay for uint256;
    using SafeERC20Permit for IERC20Permit;

    /**
     * @notice Records the assets received from account in a swap.
     * Burning any existing shared debt or increasing collateral deposits.
     * @param _assetInAddr The asset received.
     * @param _assetIn The asset in struct.
     * @param _amountIn The amount of the asset received.
     * @param _assetsFrom The account that holds the assets to burn.
     * @return The value of the assets received into the protocol, used to calculate assets out.
     */
    function handleAssetsIn(
        SCDPState storage self,
        address _assetInAddr,
        Asset storage _assetIn,
        uint256 _amountIn,
        address _assetsFrom
    ) internal returns (uint256) {
        SCDPAssetData storage assetData = self.assetData[_assetInAddr];
        uint256 debt = _assetIn.toRebasingAmount(assetData.debt);

        uint256 collateralIn; // assets used increase "swap" owned collateral
        uint256 debtOut; // assets used to burn debt

        if (debt < _amountIn) {
            // == Debt is less than the amount received.
            // 1. Burn full debt.
            debtOut = debt;
            // 2. Increase collateral by remainder.
            unchecked {
                collateralIn = _amountIn - debt;
            }
        } else {
            // == Debt is greater than the amount.
            // 1. Burn full amount received.
            debtOut = _amountIn;
            // 2. No increase in collateral.
        }

        if (collateralIn > 0) {
            uint128 collateralInWrite = uint128(_assetIn.toNonRebasingAmount(collateralIn));
            unchecked {
                // 1. Increase collateral deposits.
                assetData.totalDeposits += collateralInWrite;
                // 2. Increase "swap" collateral.
                assetData.swapDeposits += collateralInWrite;
            }
        }

        if (debtOut > 0) {
            unchecked {
                // 1. Burn debt that was repaid from the assets received.
                assetData.debt -= burnSCDP(_assetIn, debtOut, _assetsFrom);
            }
        }

        assert(_amountIn == debtOut + collateralIn);
        return _assetIn.debtAmountToValue(_amountIn, true); // ignore kFactor here
    }

    /**
     * @notice Records the assets to send out in a swap.
     * Increasing debt of the pool by minting new assets when required.
     * @param _assetOutAddr The asset to send out.
     * @param _assetOut The asset out struct.
     * @param _valueIn The value received in.
     * @param _assetsTo The asset receiver.
     * @return amountOut The amount of the asset out.
     */
    function handleAssetsOut(
        SCDPState storage self,
        address _assetOutAddr,
        Asset storage _assetOut,
        uint256 _valueIn,
        address _assetsTo
    ) internal returns (uint256 amountOut) {
        SCDPAssetData storage assetData = self.assetData[_assetOutAddr];
        uint128 swapDeposits = uint128(_assetOut.toRebasingAmount(assetData.swapDeposits)); // current "swap" collateral

        // Calculate amount to send out from value received in.
        amountOut = _assetOut.debtValueToAmount(_valueIn, true);

        uint256 collateralOut; // decrease in "swap" collateral
        uint256 debtIn; // new debt required to mint

        if (swapDeposits < amountOut) {
            // == "Swap" owned collateral is less than requested amount.
            // 1. Issue debt for remainder.
            unchecked {
                debtIn = amountOut - swapDeposits;
            }
            // 2. Reduce "swap" owned collateral to zero.
            collateralOut = swapDeposits;
        } else {
            // == "Swap" owned collateral exceeds requested amount
            // 1. No debt issued.
            // 2. Decrease collateral by full amount.
            collateralOut = amountOut;
        }

        if (collateralOut > 0) {
            uint128 amountOutInternal = uint128(_assetOut.toNonRebasingAmount(collateralOut));
            unchecked {
                // 1. Decrease collateral deposits.
                assetData.totalDeposits -= amountOutInternal;
                // 2. Decrease "swap" owned collateral.
                assetData.swapDeposits -= amountOutInternal;
            }
            if (_assetsTo != address(this)) {
                // 3. Transfer collateral to receiver if it is not this contract.
                IERC20Permit(_assetOutAddr).safeTransfer(_assetsTo, collateralOut);
            }
        }

        if (debtIn > 0) {
            // 1. Issue required debt to the pool, minting new assets to receiver.
            unchecked {
                assetData.debt += mintSCDP(_assetOut, debtIn, _assetsTo);
            }
        }

        assert(amountOut == debtIn + collateralOut);
    }

    /**
     * @notice Accumulates fees to deposits as a fixed, instantaneous income.
     * @param _assetAddr The asset address
     * @param _asset The asset struct
     * @param _amount The amount to accumulate
     * @return nextLiquidityIndex The next liquidity index of the reserve
     */
    function cumulateIncome(
        SCDPState storage self,
        address _assetAddr,
        Asset storage _asset,
        uint256 _amount
    ) internal returns (uint256 nextLiquidityIndex) {
        if (_amount == 0) {
            revert CError.CUMULATE_AMOUNT_ZERO();
        }

        uint256 poolDeposits = self.userDepositAmount(_assetAddr, _asset);
        if (poolDeposits == 0) {
            revert CError.CUMULATE_NO_DEPOSITS();
        }
        // liquidity index increment is calculated this way: `(amount / totalLiquidity)`
        // division `amount / totalLiquidity` done in ray for precision
        unchecked {
            return (_asset.liquidityIndexSCDP += uint128((_amount.wadToRay().rayDiv(poolDeposits.wadToRay()))));
        }
    }
}
