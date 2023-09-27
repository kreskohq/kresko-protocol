// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {Percentages} from "libs/Percentages.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {CError} from "common/Errors.sol";

import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {SError} from "scdp/Errors.sol";
import {scdp} from "scdp/State.sol";
import {SEvent} from "scdp/Events.sol";
import {getSwapFee} from "scdp/funcs/Swap.sol";

contract SCDPSwapFacet is ISCDPSwapFacet, CModifiers {
    using SafeERC20Permit for IERC20Permit;
    using WadRay for uint256;
    using Percentages for uint256;

    /// @inheritdoc ISCDPSwapFacet
    function cumulateIncomeSCDP(address _incomeAsset, uint256 _amount) external nonReentrant returns (uint256) {
        Asset memory asset = cs().assets[_incomeAsset];
        if (!asset.isSCDPDepositAsset) {
            revert SError.INVALID_INCOME_ASSET(_incomeAsset);
        } else if (asset.liquidityIndexSCDP == 0) {
            revert SError.INVALID_INCOME_ASSET(_incomeAsset);
        } else if (scdp().assetData[_incomeAsset].totalDeposits == 0) {
            revert SError.INVALID_INCOME_ASSET(_incomeAsset);
        } else if (!scdp().isEnabled[_incomeAsset]) {
            revert SError.ASSET_NOT_ENABLED(_incomeAsset);
        }

        IERC20Permit(_incomeAsset).safeTransferFrom(msg.sender, address(this), _amount);

        emit SEvent.Income(_incomeAsset, _amount);
        return scdp().cumulateIncome(_incomeAsset, asset, _amount);
    }

    /// @inheritdoc ISCDPSwapFacet
    function previewSwapSCDP(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol) {
        // Check that assets can be swapped, get the fee percentages.
        if (!scdp().isSwapEnabled[_assetIn][_assetOut]) {
            revert SError.SWAP_NOT_ENABLED(_assetIn, _assetOut);
        } else if (_assetIn == _assetOut) {
            revert CError.IDENTICAL_ASSETS();
        }

        Asset memory assetIn = cs().assets[_assetIn];
        Asset memory assetOut = cs().assets[_assetOut];
        (uint256 feePercentage, uint256 protocolFee) = getSwapFee(assetIn, assetOut);

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
            revert SError.SWAP_ZERO_AMOUNT();
        }
        // Transfer assets into this contract.
        IERC20Permit(_assetIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        address receiver = _receiver == address(0) ? msg.sender : _receiver;
        Asset memory assetIn = cs().assets[_assetIn];
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
     * @param _assetIn The asset to swap in.
     * @param assetIn The asset in struct.
     * @param _assetOut The asset to swap out.
     * @param _amountIn The amount of `_assetIn` to swap in.
     * @param _amountOutMin The minimum amount of `_assetOut` to receive.
     */
    function _swap(
        address _receiver,
        address _assetIn,
        Asset memory assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256 amountOut) {
        // Check that assets can be swapped, get the fee percentages.
        if (!scdp().isSwapEnabled[_assetIn][_assetOut]) {
            revert SError.SWAP_NOT_ENABLED();
        } else if (_assetIn == _assetOut) {
            revert CError.IDENTICAL_ASSETS();
        }

        Asset memory assetOut = cs().assets[_assetOut];

        (uint256 feePercentage, uint256 protocolFee) = getSwapFee(assetIn, assetOut);

        // Get the fees from amount received.
        uint256 feeAmount = _amountIn.percentMul(feePercentage);

        unchecked {
            _amountIn -= feeAmount;
        }
        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = scdp().handleAssetsIn(
            _assetIn,
            assetIn,
            _amountIn, // Work with fee reduced amount from here.
            address(this)
        );

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(_assetOut, assetOut, valueIn, _receiver);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(_assetIn, assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
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
        Asset memory _assetIn,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256 amountOut) {
        address assetOutAddress = scdp().feeAsset;
        Asset memory assetOut = cs().assets[assetOutAddress];

        // Get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = getSwapFee(_assetIn, assetOut);

        // Assets received pay off debt and/or increase SCDP owned collateral.

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(
            assetOutAddress,
            assetOut,
            scdp().handleAssetsIn(_assetInAddr, _assetIn, _amountIn, address(this)),
            address(this)
        );

        uint256 feeAmount = amountOut.percentMul(feePercentage);
        unchecked {
            amountOut -= feeAmount;
        }

        IERC20Permit(assetOutAddress).safeTransfer(_receiver, amountOut);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(assetOutAddress, assetOut, amountOut, _amountOutMin, feeAmount, protocolFee);
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
    function _feeSwap(
        address _receiver,
        address _assetInAddr,
        Asset memory _assetIn,
        address _assetOutAddr,
        Asset memory _assetOut,
        uint256 _amountIn
    ) internal returns (uint256) {
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

    function _checkAndPayFee(
        address _payAssetAddress,
        Asset memory _payAsset,
        uint256 _amountOut,
        uint256 _amountOutMin,
        uint256 _feeAmount,
        uint256 _protocolFeePct
    ) private {
        // State modifications done, check MCR and slippage.
        if (_amountOut < _amountOutMin) {
            revert SError.SWAP_SLIPPAGE(_amountOut, _amountOutMin);
        }
        if (_feeAmount > 0) {
            address feeAssetAddr = scdp().feeAsset;
            _payFee(feeAssetAddr, cs().assets[feeAssetAddr], _payAssetAddress, _payAsset, _feeAmount, _protocolFeePct);
        }
        if (scdp().debtExceedsCollateral(scdp().minCollateralRatio)) {
            revert CError.DEBT_EXCEEDS_COLLATERAL();
        }
    }

    function _payFee(
        address _feeAssetAddress,
        Asset memory _feeAsset,
        address _payAssetAddress,
        Asset memory _payAsset,
        uint256 _feeAmount,
        uint256 _protocolFeePct
    ) private {
        if (_feeAssetAddress != _payAssetAddress) {
            _feeAmount = _feeSwap(address(this), _payAssetAddress, _payAsset, _feeAssetAddress, _feeAsset, _feeAmount);
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
