// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20Permit, IERC20Permit} from "vendor/SafeERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {ms} from "minter/State.sol";

import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {scdp} from "scdp/State.sol";
import {SEvent} from "scdp/Events.sol";

contract SCDPSwapFacet is ISCDPSwapFacet, DSModifiers {
    using SafeERC20Permit for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ISCDPSwapFacet
    function cumulateIncomeSCDP(address _incomeAsset, uint256 _amount) external nonReentrant returns (uint256) {
        require(scdp().collateral[_incomeAsset].liquidityIndex != 0, "not-collateral");
        require(scdp().isEnabled[_incomeAsset], "collateral-not-enabled");
        require(scdp().totalDeposits[_incomeAsset] > 0, "no-deposits");
        IERC20Permit(_incomeAsset).safeTransferFrom(msg.sender, address(this), _amount);

        emit SEvent.Income(_incomeAsset, _amount);
        return scdp().cumulateIncome(_incomeAsset, _amount);
    }

    function getPriceSCDP(address _asset) external view returns (uint256 price) {
        if (ms().kreskoAssets[_asset].id != bytes32("")) {
            price = ms().kreskoAssets[_asset].price();
        } else {
            price = ms().collateralAssets[_asset].price();
        }
        require(price != 0, "price-0");
    }

    /// @inheritdoc ISCDPSwapFacet
    function previewSwapSCDP(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = scdp().checkAssets(_assetIn, _assetOut);

        // Get the fees from amount received.
        feeAmount = _amountIn.wadMul(feePercentage);
        uint256 valueIn = ms().kreskoAssets[_assetIn].uintUSD(_amountIn - feeAmount);

        amountOut = valueIn.wadDiv(ms().kreskoAssets[_assetOut].price());
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

        emit SEvent.Swap(
            msg.sender,
            _assetIn,
            _assetOut,
            _amountIn,
            _assetOut == scdp().feeAsset
                ? _swapFeeAssetOut(receiver, _assetIn, _amountIn, _amountOutMin)
                : _swap(receiver, _assetIn, _assetOut, _amountIn, _amountOutMin)
        );
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetIn The asset to swap in.
     * @param _assetOut The asset to swap out.
     * @param _amountIn The amount of `_assetIn` to swap in.
     * @param _amountOutMin The minimum amount of `_assetOut` to receive.
     */
    function _swap(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256 amountOut) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = scdp().checkAssets(_assetIn, _assetOut);

        // Get the fees from amount received.
        uint256 feeAmount = _amountIn.wadMul(feePercentage);

        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = scdp().handleAssetsIn(
            _assetIn,
            _amountIn - feeAmount, // Work with fee reduced amount from here.
            address(this)
        );

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(_assetOut, valueIn, _receiver);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(_assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetIn The asset to swap in.
     * @param _amountIn The amount of `_assetIn` to swap in.
     * @param _amountOutMin The minimum amount of `_assetOut` to receive.
     */
    function _swapFeeAssetOut(
        address _receiver,
        address _assetIn,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256 amountOut) {
        address assetOut = scdp().feeAsset;
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = scdp().checkAssets(_assetIn, assetOut);

        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = scdp().handleAssetsIn(_assetIn, _amountIn, address(this));

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = scdp().handleAssetsOut(assetOut, valueIn, address(this));

        uint256 feeAmount = amountOut.wadMul(feePercentage);
        amountOut -= feeAmount;

        IERC20Permit(assetOut).safeTransfer(_receiver, amountOut);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(assetOut, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps assets in the collateral pool.
     * @param _receiver The address to receive the swapped assets.
     * @param _assetIn The asset to swap in.
     * @param _assetOut The asset to swap out.
     * @param _amountIn The amount of `_assetIn` to swap in
     */
    function _feeSwap(address _receiver, address _assetIn, address _assetOut, uint256 _amountIn) internal returns (uint256) {
        require(scdp().isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(_assetIn != _assetOut, "same-asset");
        return scdp().handleAssetsOut(_assetOut, scdp().handleAssetsIn(_assetIn, _amountIn, address(this)), _receiver);
    }

    function _checkAndPayFee(
        address _payAsset,
        uint256 _amountOut,
        uint256 _amountOutMin,
        uint256 _feeAmount,
        uint256 _protocolFeePct
    ) private {
        // State modifications done, check MCR and slippage.
        require(_amountOut >= _amountOutMin, "lev-swap-slippage");
        if (_feeAmount != 0) _payFee(scdp().feeAsset, _payAsset, _feeAmount, _protocolFeePct);
        require(scdp().checkSCDPRatio(scdp().minCollateralRatio), "swap-mcr-violation");
    }

    function _payFee(address _feeAsset, address _payAsset, uint256 _feeAmount, uint256 _protocolFeePct) private {
        if (_feeAsset != _payAsset) {
            _feeAmount = _feeSwap(address(this), _payAsset, _feeAsset, _feeAmount);
        }

        uint256 protocolFeeTaken = _feeAmount.wadMul(_protocolFeePct);
        _feeAmount -= protocolFeeTaken;

        if (_feeAmount != 0) scdp().cumulateIncome(_feeAsset, _feeAmount);
        if (protocolFeeTaken != 0) IERC20Permit(_feeAsset).safeTransfer(ms().feeRecipient, protocolFeeTaken);

        emit SEvent.SwapFee(_feeAsset, _payAsset, _feeAmount, protocolFeeTaken);
    }
}
