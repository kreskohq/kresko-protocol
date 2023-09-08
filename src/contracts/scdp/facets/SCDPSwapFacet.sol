// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {DiamondModifiers} from "diamond/libs/LibDiamond.sol";
import {ms} from "minter/libs/LibMinterBig.sol";

import {ISCDPSwapFacet} from "../interfaces/ISCDPSwapFacet.sol";
import {scdp} from "../libs/LibSCDP.sol";
import {Shared} from "common/libs/Shared.sol";

contract SCDPSwapFacet is ISCDPSwapFacet, DiamondModifiers {
    using SafeERC20 for IERC20Permit;
    using WadRay for uint256;

    /// @inheritdoc ISCDPSwapFacet
    function cumulateIncome(address _incomeAsset, uint256 _amount) external nonReentrant returns (uint256) {
        require(scdp().poolCollateral[_incomeAsset].liquidityIndex != 0, "not-collateral");
        require(scdp().isEnabled[_incomeAsset], "collateral-not-enabled");
        require(scdp().totalDeposits[_incomeAsset] > 0, "no-deposits");
        IERC20Permit(_incomeAsset).safeTransferFrom(msg.sender, address(this), _amount);

        emit Income(_incomeAsset, _amount);
        return scdp().cumulateIncome(_incomeAsset, _amount);
    }

    function getPrice(address _asset) external view returns (uint256 price) {
        if (address(ms().kreskoAssets[_asset].oracle) != address(0)) {
            price = ms().kreskoAssets[_asset].uintPrice(ms().oracleDeviationPct);
        } else {
            price = ms().collateralAssets[_asset].uintPrice(ms().oracleDeviationPct);
        }
        require(price != 0, "price-0");
    }

    /// @inheritdoc ISCDPSwapFacet
    function previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = scdp().checkAssets(_assetIn, _assetOut);

        // Get the fees from amount received.
        feeAmount = _amountIn.wadMul(feePercentage);
        uint256 valueIn = ms().kreskoAssets[_assetIn].uintUSD(_amountIn - feeAmount, ms().oracleDeviationPct);

        amountOut = valueIn.wadDiv(ms().kreskoAssets[_assetOut].uintPrice(ms().oracleDeviationPct));
        feeAmountProtocol = feeAmount.wadMul(protocolFee);
        feeAmount -= feeAmountProtocol;
    }

    /// @inheritdoc ISCDPSwapFacet
    function swap(
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

        emit Swap(
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
    function _feeSwap(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) internal returns (uint256) {
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
        require(Shared.checkSCDPRatio(scdp().minimumCollateralizationRatio), "lev-swap-mcr-violation");
    }

    function _payFee(address _feeAsset, address _payAsset, uint256 _feeAmount, uint256 _protocolFeePct) private {
        if (_feeAsset != _payAsset) {
            _feeAmount = _feeSwap(address(this), _payAsset, _feeAsset, _feeAmount);
        }

        uint256 protocolFeeTaken = _feeAmount.wadMul(_protocolFeePct);
        _feeAmount -= protocolFeeTaken;

        if (_feeAmount != 0) scdp().cumulateIncome(_feeAsset, _feeAmount);
        if (protocolFeeTaken != 0) IERC20Permit(_feeAsset).safeTransfer(ms().feeRecipient, protocolFeeTaken);

        emit SwapFee(_feeAsset, _payAsset, _feeAmount, protocolFeeTaken);
    }
}
