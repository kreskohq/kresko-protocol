// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {mintSCDP, burnSCDP} from "common/funcs/Actions.sol";
import {Asset} from "common/Types.sol";
import {SCDPState} from "scdp/State.sol";
import {cs} from "common/State.sol";

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
     * @return valueIn The value of the assets received into the protocol, used to calculate assets out.
     */
    function handleAssetsIn(
        SCDPState storage self,
        address _assetInAddr,
        Asset memory _assetIn,
        uint256 _amountIn,
        address _assetsFrom
    ) internal returns (uint256 valueIn) {
        uint256 debt = _assetIn.toRebasingAmount(self.debt[_assetInAddr]);
        valueIn = _assetIn.debtAmountToValue(_amountIn, true); // ignore kFactor here

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

        if (collateralIn > 0) {
            uint128 collateralInWrite = uint128(_assetIn.amountWrite(collateralIn));
            // 1. Increase collateral deposits.
            self.sDeposits[_assetInAddr].totalDeposits += collateralInWrite;
            // 2. Increase "swap" collateral.
            self.sDeposits[_assetInAddr].swapDeposits += collateralInWrite;
        }

        if (debtOut > 0) {
            // 1. Burn debt that was repaid from the assets received.
            self.debt[_assetInAddr] -= burnSCDP(_assetIn, debtOut, _assetsFrom);
        }

        assert(_amountIn == debtOut + collateralIn);
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
        Asset memory _assetOut,
        uint256 _valueIn,
        address _assetsTo
    ) internal returns (uint256 amountOut) {
        // Calculate amount to send out from value received in.
        amountOut = _assetOut.debtValueToAmount(_valueIn, true);
        // Well, should be more than 0.
        require(amountOut > 0, "amount-out-is-zero");

        uint128 swapDeposits = uint128(_assetOut.amountRead(self.sDeposits[_assetOutAddr].swapDeposits)); // current "swap" collateral

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
            uint128 amountOutInternal = uint128(_assetOut.amountWrite(collateralOut));
            // 1. Decrease collateral deposits.
            self.sDeposits[_assetOutAddr].totalDeposits -= amountOutInternal;
            // 2. Decrease "swap" owned collateral.
            self.sDeposits[_assetOutAddr].swapDeposits -= amountOutInternal;
            if (_assetsTo != address(this)) {
                // 3. Transfer collateral to receiver if it is not this contract.
                IERC20Permit(_assetOutAddr).safeTransfer(_assetsTo, collateralOut);
            }
        }

        if (debtIn > 0) {
            // 1. Issue required debt to the pool, minting new assets to receiver.
            self.debt[_assetOutAddr] += mintSCDP(_assetOut, debtIn, _assetsTo);
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
        Asset memory _asset,
        uint256 _amount
    ) internal returns (uint256 nextLiquidityIndex) {
        require(_amount != 0, "amount-zero");

        uint256 poolDeposits = self.totalDepositAmount(_assetAddr, _asset);
        require(poolDeposits != 0, "no-deposits");
        // liquidity index increment is calculated this way: `(amount / totalLiquidity)`
        // division `amount / totalLiquidity` done in ray for precision

        return (cs().assets[_assetAddr].liquidityIndexSCDP += uint128((_amount.wadToRay().rayDiv(poolDeposits.wadToRay()))));
    }
}
