// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {SafeERC20, IERC20Permit} from "../../../shared/SafeERC20.sol";
import {DiamondModifiers} from "../../../diamond/DiamondModifiers.sol";
import {ms} from "../../MinterStorage.sol";
import {WadRay} from "../../../libs/WadRay.sol";
import {ICollateralPoolSwapFacet} from "../interfaces/ICollateralPoolSwapFacet.sol";
import {cps} from "../CollateralPoolState.sol";

contract CollateralPoolSwapFacet is ICollateralPoolSwapFacet, DiamondModifiers {
    using SafeERC20 for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ICollateralPoolSwapFacet
    function swap(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) external nonReentrant {
        require(_amountIn > 0, "swap-amount-zero");

        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);

        // Transfer assets into this contract.
        IERC20Permit(_assetIn).safeTransferFrom(msg.sender, address(this), _amountIn);

        // Get the fees from amount received.
        uint256 feeAmount = _amountIn.wadMul(feePercentage);

        // Assets received pay off debt and/or increase "swap" owned collateral.
        uint256 valueIn = cps().handleAssetsIn(
            _assetIn,
            _amountIn - feeAmount // Work with fee reduced amount from here.
        );

        // Safeguard
        address receiver = _receiver == address(0) ? msg.sender : _receiver;

        // Assets sent out are newly minted debt and/or "swap" owned collateral.
        uint256 amountOut = cps().handleAssetsOut(_assetOut, valueIn, receiver);

        require(amountOut >= _amountOutMin, "swap-out-slippage");

        // State modifications done, check MCR.
        require(cps().checkRatio(cps().minimumCollateralizationRatio), "swap-mcr-violation");

        emit Swap(msg.sender, _assetIn, _assetOut, _amountIn, amountOut);

        // Send fees to the fee receivers.
        uint256 protocolFeeTaken = feeAmount.wadMul(protocolFee);
        feeAmount -= protocolFeeTaken;

        IERC20Permit(_assetIn).safeTransfer(cps().swapFeeRecipient, feeAmount);
        IERC20Permit(_assetIn).safeTransfer(ms().feeRecipient, protocolFeeTaken);

        emit SwapFee(_assetIn, feeAmount, protocolFeeTaken);
    }

    /// @inheritdoc ICollateralPoolSwapFacet
    function cumulateIncome(address _incomeAsset, uint256 _amount) public nonReentrant {
        require(cps().poolCollateral[_incomeAsset].liquidityIndex != 0, "not-collateral");
        require(cps().isEnabled[_incomeAsset], "collateral-not-enabled");
        require(cps().totalDeposits[_incomeAsset] > 0, "no-deposits");
        IERC20Permit(_incomeAsset).safeTransferFrom(msg.sender, address(this), _amount);
        cps().cumulateIncome(_incomeAsset, _amount);

        emit Income(_incomeAsset, _amount);
    }
}
