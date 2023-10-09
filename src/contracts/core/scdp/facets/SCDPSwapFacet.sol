// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {CError} from "common/CError.sol";

import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {scdp} from "scdp/State.sol";
import {SEvent} from "scdp/Events.sol";

contract SCDPSwapFacet is ISCDPSwapFacet, CModifiers {
    using SafeERC20Permit for IERC20Permit;
    using WadRay for uint256;
    using PercentageMath for uint256;

    /// @inheritdoc ISCDPSwapFacet
    function cumulateIncomeSCDP(address _depositAssetAddr, uint256 _incomeAmount) external nonReentrant returns (uint256) {
        if (_incomeAmount == 0) revert CError.ZERO_AMOUNT(_depositAssetAddr);
        Asset storage asset = cs().assets[_depositAssetAddr];

        bool isValid = asset.isSCDPDepositAsset &&
            asset.liquidityIndexSCDP != 0 &&
            scdp().userDepositAmount(_depositAssetAddr, asset) != 0;
        if (!isValid) revert CError.NOT_INCOME_ASSET(_depositAssetAddr);

        IERC20Permit(_depositAssetAddr).safeTransferFrom(msg.sender, address(this), _incomeAmount);

        emit SEvent.Income(_depositAssetAddr, _incomeAmount);
        return scdp().cumulateIncome(_depositAssetAddr, asset, _incomeAmount);
    }

    /// @inheritdoc ISCDPSwapFacet
    function previewSwapSCDP(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol) {
        // Check that assets can be swapped, get the fee percentages.
        if (!scdp().isSwapEnabled[_assetIn][_assetOut]) {
            revert CError.SWAP_NOT_ENABLED(_assetIn, _assetOut);
        } else if (_assetIn == _assetOut) {
            revert CError.IDENTICAL_ASSETS();
        }

        Asset storage assetIn = cs().assets[_assetIn];
        if (!assetIn.isSCDPKrAsset) revert CError.INVALID_ASSET(_assetIn);

        Asset storage assetOut = cs().assets[_assetOut];
        if (!assetOut.isSCDPKrAsset) revert CError.INVALID_ASSET(_assetIn);
        (uint256 feePercentage, uint256 protocolFee) = getSwapFees(assetIn, assetOut);

        // Get the fees from amount received.
        feeAmount = _amountIn.percentMul(feePercentage);
        amountOut = assetIn.uintUSD(_amountIn - feeAmount).wadDiv(assetOut.price());

        feeAmountProtocol = feeAmount.percentMul(protocolFee);
        feeAmount -= feeAmountProtocol;
    }

    /// @inheritdoc ISCDPSwapFacet
    function swapSCDP(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) external nonReentrant {
        if (_amountIn == 0) {
            revert CError.SWAP_ZERO_AMOUNT();
        }
        // Transfer assets into this contract.
        IERC20Permit(_assetIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        address receiver = _receiver == address(0) ? msg.sender : _receiver;
        Asset storage assetIn = cs().assets[_assetIn];

        if (!assetIn.isSCDPKrAsset) revert CError.INVALID_ASSET(_assetIn);

        emit SEvent.Swap(
            msg.sender,
            _assetIn,
            _assetOut,
            _amountIn,
            _assetOut == scdp().feeAsset
                ? _swapFeeAssetOut(receiver, _assetIn, assetIn, _amountIn, _amountOutMin)
                : _swap(receiver, _assetIn, assetIn, _assetOut, _amountIn, _amountOutMin)
        );
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetInAddr The asset to swap in.
     * @param _assetIn The asset in struct.
     * @param _assetOutAddr The asset to swap out.
     * @param _amountIn The amount of `_assetIn` to swap in.
     * @param _amountOutMin The minimum amount of `_assetOut` to receive.
     */
    function _swap(
        address _receiver,
        address _assetInAddr,
        Asset storage _assetIn,
        address _assetOutAddr,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) private returns (uint256 amountOut) {
        Asset storage assetOut = cs().assets[_assetOutAddr];
        if (!assetOut.isSCDPKrAsset) revert CError.INVALID_ASSET(_assetOutAddr);

        // Check that assets can be swapped, get the fee percentages.
        if (!scdp().isSwapEnabled[_assetInAddr][_assetOutAddr]) {
            revert CError.SWAP_NOT_ENABLED(_assetInAddr, _assetOutAddr);
        } else if (_assetInAddr == _assetOutAddr) {
            revert CError.IDENTICAL_ASSETS();
        }

        (uint256 feePercentage, uint256 protocolFee) = getSwapFees(_assetIn, assetOut);

        // Get the fees from amount received.
        uint256 feeAmount = _amountIn.percentMul(feePercentage);

        unchecked {
            _amountIn -= feeAmount;
        }
        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = scdp().handleAssetsIn(
            _assetInAddr,
            _assetIn,
            _amountIn, // Work with fee reduced amount from here.
            address(this)
        );

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(_assetOutAddr, assetOut, valueIn, _receiver);

        // State modifications done, check MCR and slippage.
        _checkAndPayFees(_assetInAddr, _assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetInAddr The asset to swap in.
     * @param _assetIn The asset in struct.
     * @param _amountIn The amount of `_assetIn` to swap in.
     * @param _amountOutMin The minimum amount of `_assetOut` to receive.
     */
    function _swapFeeAssetOut(
        address _receiver,
        address _assetInAddr,
        Asset storage _assetIn,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) private returns (uint256 amountOut) {
        address assetOutAddr = scdp().feeAsset;
        Asset storage assetOut = cs().assets[assetOutAddr];

        // Check that assets can be swapped, get the fee percentages.
        if (!scdp().isSwapEnabled[_assetInAddr][assetOutAddr]) {
            revert CError.SWAP_NOT_ENABLED(_assetInAddr, assetOutAddr);
        } else if (_assetInAddr == assetOutAddr) {
            revert CError.IDENTICAL_ASSETS();
        }

        // Get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = getSwapFees(_assetIn, assetOut);

        // Assets received pay off debt and/or increase SCDP owned collateral.

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(
            assetOutAddr,
            assetOut,
            scdp().handleAssetsIn(_assetInAddr, _assetIn, _amountIn, address(this)),
            address(this)
        );

        uint256 feeAmount = amountOut.percentMul(feePercentage);
        unchecked {
            amountOut -= feeAmount;
        }

        IERC20Permit(assetOutAddr).safeTransfer(_receiver, amountOut);

        // State modifications done, check MCR and slippage.
        _checkAndPayFees(assetOutAddr, assetOut, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetInAddr The asset to swap in.
     * @param _assetIn The asset in struct.
     * @param _assetOutAddr The asset to swap out.
     * @param _assetOut The asset out struct.
     * @param _amountIn The amount of `_assetIn` to swap in
     */
    function _swapToFeeAsset(
        address _receiver,
        address _assetInAddr,
        Asset storage _assetIn,
        address _assetOutAddr,
        Asset storage _assetOut,
        uint256 _amountIn
    ) private returns (uint256) {
        if (_assetInAddr == _assetOutAddr) {
            revert CError.IDENTICAL_ASSETS();
        }
        return
            scdp().handleAssetsOut(
                _assetOutAddr,
                _assetOut,
                scdp().handleAssetsIn(_assetInAddr, _assetIn, _amountIn, address(this)),
                _receiver
            );
    }

    function _checkAndPayFees(
        address _payAssetAddr,
        Asset storage _payAsset,
        uint256 _amountOut,
        uint256 _amountOutMin,
        uint256 _feeAmount,
        uint256 _protocolFeePct
    ) private {
        // State modifications done, check MCR and slippage.
        if (_amountOut < _amountOutMin) {
            revert CError.SWAP_SLIPPAGE(_amountOut, _amountOutMin);
        }
        if (_feeAmount > 0) {
            address feeAssetAddr = scdp().feeAsset;
            _paySwapFees(feeAssetAddr, cs().assets[feeAssetAddr], _payAssetAddr, _payAsset, _feeAmount, _protocolFeePct);
        }
        scdp().checkCollateralValue(scdp().minCollateralRatio);
    }

    function _paySwapFees(
        address _feeAssetAddress,
        Asset storage _feeAsset,
        address _payAssetAddress,
        Asset storage _payAsset,
        uint256 _feeAmount,
        uint256 _protocolFeePct
    ) private {
        if (_feeAssetAddress != _payAssetAddress) {
            _feeAmount = _swapToFeeAsset(address(this), _payAssetAddress, _payAsset, _feeAssetAddress, _feeAsset, _feeAmount);
        }

        uint256 protocolFeeTaken = _feeAmount.percentMul(_protocolFeePct);
        unchecked {
            _feeAmount -= protocolFeeTaken;
        }

        if (_feeAmount != 0) scdp().cumulateIncome(_feeAssetAddress, _feeAsset, _feeAmount);
        if (protocolFeeTaken != 0) IERC20Permit(_feeAssetAddress).safeTransfer(cs().feeRecipient, protocolFeeTaken);

        emit SEvent.SwapFee(_feeAssetAddress, _payAssetAddress, _feeAmount, protocolFeeTaken);
    }
}

/**
 * @notice Get fee percentage for a swap pair.
 * @return feePercentage fee percentage for this swap
 * @return protocolFee protocol fee percentage taken from the fee
 */
function getSwapFees(
    Asset storage _assetIn,
    Asset storage _assetOut
) view returns (uint256 feePercentage, uint256 protocolFee) {
    unchecked {
        feePercentage = _assetIn.swapOutFeeSCDP + _assetOut.swapInFeeSCDP;
        protocolFee = _assetIn.protocolFeeShareSCDP + _assetOut.protocolFeeShareSCDP;
    }
}
