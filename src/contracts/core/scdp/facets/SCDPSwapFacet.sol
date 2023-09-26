// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {CModifiers} from "common/Modifiers.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";

import {getSwapFee} from "scdp/funcs/Common.sol";
import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {scdp} from "scdp/State.sol";
import {SEvent} from "scdp/Events.sol";

contract SCDPSwapFacet is ISCDPSwapFacet, CModifiers {
    using SafeERC20Permit for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ISCDPSwapFacet
    function cumulateIncomeSCDP(address _incomeAsset, uint256 _amount) external nonReentrant returns (uint256) {
        Asset memory asset = cs().assets[_incomeAsset];
        require(asset.liquidityIndexSCDP != 0, "not-collateral");
        require(scdp().isEnabled[_incomeAsset], "collateral-not-enabled");
        require(scdp().sDeposits[_incomeAsset].totalDeposits > 0, "no-deposits");
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
        require(scdp().isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(scdp().isEnabled[_assetIn], "asset-in-disabled");
        require(scdp().isEnabled[_assetOut], "asset-out-disabled");
        require(_assetIn != _assetOut, "same-asset");

        Asset memory assetIn = cs().assets[_assetIn];
        Asset memory assetOut = cs().assets[_assetOut];
        (uint256 feePercentage, uint256 protocolFee) = getSwapFee(assetIn, assetOut);

        // Get the fees from amount received.
        feeAmount = _amountIn.wadMul(feePercentage);
        uint256 valueIn = assetIn.uintUSD(_amountIn - feeAmount);

        amountOut = valueIn.wadDiv(assetOut.price());
        feeAmountProtocol = feeAmount.wadMul(protocolFee);
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
        require(_amountIn != 0, "swap-amount-zero");
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
        require(scdp().isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(scdp().isEnabled[_assetIn], "asset-in-disabled");
        require(scdp().isEnabled[_assetOut], "asset-out-disabled");
        require(_assetIn != _assetOut, "same-asset");

        Asset memory assetOut = cs().assets[_assetOut];

        (uint256 feePercentage, uint256 protocolFee) = getSwapFee(assetIn, assetOut);

        // Get the fees from amount received.
        uint256 feeAmount = _amountIn.wadMul(feePercentage);

        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = scdp().handleAssetsIn(
            _assetIn,
            assetIn,
            _amountIn - feeAmount, // Work with fee reduced amount from here.
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
     * @param _assetIn The asset to swap in.
     * @param assetIn The asset in struct.
     * @param _amountIn The amount of `_assetIn` to swap in.
     * @param _amountOutMin The minimum amount of `_assetOut` to receive.
     */
    function _swapFeeAssetOut(
        address _receiver,
        address _assetIn,
        Asset memory assetIn,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256 amountOut) {
        address assetOutAddress = scdp().feeAsset;
        Asset memory assetOut = cs().assets[assetOutAddress];

        // Get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = getSwapFee(assetIn, assetOut);

        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = scdp().handleAssetsIn(_assetIn, assetIn, _amountIn, address(this));

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(assetOutAddress, assetOut, valueIn, address(this));

        uint256 feeAmount = amountOut.wadMul(feePercentage);
        amountOut -= feeAmount;

        IERC20Permit(assetOutAddress).safeTransfer(_receiver, amountOut);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(assetOutAddress, assetOut, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetIn The asset to swap in.
     * @param assetIn The asset in struct.
     * @param _assetOut The asset to swap out.
     * @param assetOut The asset out struct.
     * @param _amountIn The amount of `_assetIn` to swap in
     */
    function _feeSwap(
        address _receiver,
        address _assetIn,
        Asset memory assetIn,
        address _assetOut,
        Asset memory assetOut,
        uint256 _amountIn
    ) internal returns (uint256) {
        require(scdp().isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(_assetIn != _assetOut, "same-asset");
        return
            scdp().handleAssetsOut(
                _assetOut,
                assetOut,
                scdp().handleAssetsIn(_assetIn, assetIn, _amountIn, address(this)),
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
        require(_amountOut >= _amountOutMin, "lev-swap-slippage");
        if (_feeAmount != 0) {
            address feeAsset = scdp().feeAsset;
            _payFee(feeAsset, cs().assets[feeAsset], _payAssetAddress, _payAsset, _feeAmount, _protocolFeePct);
        }
        require(scdp().checkSCDPRatio(scdp().minCollateralRatio), "swap-mcr-violation");
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

        uint256 protocolFeeTaken = _feeAmount.wadMul(_protocolFeePct);
        _feeAmount -= protocolFeeTaken;

        if (_feeAmount != 0) scdp().cumulateIncome(_feeAssetAddress, _feeAsset, _feeAmount);
        if (protocolFeeTaken != 0) IERC20Permit(_feeAssetAddress).safeTransfer(cs().feeRecipient, protocolFeeTaken);

        emit SEvent.SwapFee(_feeAssetAddress, _payAssetAddress, _feeAmount, protocolFeeTaken);
    }
}
