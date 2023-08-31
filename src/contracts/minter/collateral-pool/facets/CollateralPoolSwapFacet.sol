// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
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
    function cumulateIncome(address _incomeAsset, uint256 _amount) public nonReentrant {
        require(cps().poolCollateral[_incomeAsset].liquidityIndex != 0, "not-collateral");
        require(cps().isEnabled[_incomeAsset], "collateral-not-enabled");
        require(cps().totalDeposits[_incomeAsset] > 0, "no-deposits");
        IERC20Permit(_incomeAsset).safeTransferFrom(msg.sender, address(this), _amount);
        cps().cumulateIncome(_incomeAsset, _amount);

        emit Income(_incomeAsset, _amount);
    }

    function getPrice(address _asset) external view returns (uint256 price) {
        if (address(ms().kreskoAssets[_asset].oracle) != address(0)) {
            price = ms().kreskoAssets[_asset].uintPrice();
        } else {
            price = ms().collateralAssets[_asset].uintPrice();
        }
        require(price != 0, "price-0");
    }

    /// @inheritdoc ICollateralPoolSwapFacet
    function previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);

        // Get the fees from amount received.
        feeAmount = _amountIn.wadMul(feePercentage);
        uint256 valueIn = ms().kreskoAssets[_assetIn].uintUSD(_amountIn - feeAmount);

        amountOut = valueIn.wadDiv(ms().kreskoAssets[_assetOut].uintPrice());
        feeAmountProtocol = feeAmount.wadMul(protocolFee);
        feeAmount -= feeAmountProtocol;
    }

    /// @inheritdoc ICollateralPoolSwapFacet
    function swap(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) external nonReentrant {
        require(_amountIn > 0, "swap-amount-zero");

        // Transfer assets into this contract.
        IERC20Permit(_assetIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        address receiver = _receiver == address(0) ? msg.sender : _receiver;

        emit Swap(
            msg.sender,
            _assetIn,
            _assetOut,
            _amountIn,
            _swap(receiver, _assetIn, _assetOut, _amountIn, _amountOutMin)
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
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);
        // Get the fees from amount received.
        uint256 feeAmount = _amountIn.wadMul(feePercentage);

        // Assets received pay off debt and/or increase SCDP owned collateral.
        uint256 valueIn = cps().handleAssetsIn(
            _assetIn,
            _amountIn - feeAmount, // Work with fee reduced amount from here.
            address(this)
        );

        // Assets sent out are newly minted debt and/or SCDP owned collateral.
        amountOut = cps().handleAssetsOut(_assetOut, valueIn, _receiver);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(_assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    function _checkAndPayFee(
        address _feeAsset,
        uint256 _amountOut,
        uint256 _amountOutMin,
        uint256 _feeAmount,
        uint256 _protocolFee
    ) private {
        // State modifications done, check MCR and slippage.
        require(_amountOut >= _amountOutMin, "lev-swap-slippage");
        require(cps().checkRatio(cps().minimumCollateralizationRatio), "lev-swap-mcr-violation");
        _payFee(_feeAsset, _feeAmount, _protocolFee);
    }

    function _payFee(address _feeAsset, uint256 _feeAmount, uint256 _protocolFee) private {
        uint256 protocolFeeTaken = _feeAmount.wadMul(_protocolFee);
        _feeAmount -= protocolFeeTaken;

        // Send fees to the fee receivers.
        IERC20Permit(_feeAsset).safeTransfer(cps().swapFeeRecipient, _feeAmount);
        IERC20Permit(_feeAsset).safeTransfer(ms().feeRecipient, protocolFeeTaken);

        emit SwapFee(_feeAsset, _feeAmount, protocolFeeTaken);
    }
}