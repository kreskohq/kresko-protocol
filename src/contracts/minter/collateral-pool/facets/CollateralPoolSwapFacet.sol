// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {SafeERC20, IERC20Permit} from "../../../shared/SafeERC20.sol";
import {DiamondModifiers} from "../../../diamond/DiamondModifiers.sol";
import {ms} from "../../MinterStorage.sol";
import {WadRay} from "../../../libs/WadRay.sol";
import {ICollateralPoolSwapFacet} from "../interfaces/ICollateralPoolSwapFacet.sol";
import {cps} from "../CollateralPoolState.sol";
import {ILeverPositions} from "../position/ILeverPositions.sol";
import "hardhat/console.sol";

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
        uint256 _amountIn,
        uint256 _leverage
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);

        // Get the fees from amount received.
        feeAmount = _amountIn.wadMul(_leverage).wadMul(feePercentage);
        uint256 valueIn = ms().kreskoAssets[_assetIn].uintUSD(_amountIn - feeAmount);

        amountOut = valueIn.wadDiv(ms().kreskoAssets[_assetOut].uintPrice()).wadMul(_leverage);
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

    /// @inheritdoc ICollateralPoolSwapFacet
    function swapLeverIn(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _leverage
    ) external nonReentrant returns (uint256 positionId) {
        require(_amountIn > 0, "swap-amount-zero");

        // Transfer unadjusted assets into this contract.
        IERC20Permit(_assetIn).safeTransferFrom(msg.sender, address(this), _amountIn);

        // Creating the position and sending it to leverPositions.
        (uint256 amountInAfterFee, uint256 amountOut) = _swapLeverIn(
            _assetIn,
            _assetOut,
            _amountIn,
            _amountOutMin,
            _leverage
        );

        emit Swap(msg.sender, _assetIn, _assetOut, _amountIn, amountOut);

        address receiver = _receiver == address(0) ? msg.sender : _receiver;
        uint256 timestamp = block.timestamp;

        return
            cps().leverPositions.createPosition(
                ILeverPositions.Position({
                    account: receiver,
                    collateral: _assetIn,
                    borrowed: _assetOut,
                    collateralAmount: amountInAfterFee,
                    borrowedAmount: amountOut,
                    leverage: _leverage,
                    creationTimestamp: timestamp,
                    lastUpdateTimestamp: timestamp
                })
            );
    }

    // Closes a position, called by leverPositions
    function swapLeverOut(ILeverPositions.Position memory _position) external nonReentrant returns (uint256 amountOut) {
        require(msg.sender == address(cps().leverPositions), "closeLever-not-caller");

        // Swap back to collateral.
        (, amountOut) = _swapLeverOut(
            address(this),
            _position.borrowed,
            _position.collateral,
            _position.borrowedAmount,
            1,
            _position.leverage
        );

        emit Swap(msg.sender, _position.borrowed, _position.collateral, _position.borrowedAmount, amountOut);

        // increase by profit
        if (amountOut > _position.collateralAmount) {
            amountOut =
                _position.collateralAmount +
                (amountOut - _position.collateralAmount).wadMul(_position.leverage);
            // decrease by losses
        } else if (amountOut < _position.collateralAmount) {
            amountOut =
                _position.collateralAmount -
                (_position.collateralAmount - amountOut).wadMul(_position.leverage);
        }

        IERC20Permit(_position.collateral).safeTransfer(_position.account, amountOut);
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

        // Assets received pay off debt and/or increase "swap" owned collateral.
        uint256 valueIn = cps().handleAssetsIn(
            _assetIn,
            _amountIn - feeAmount // Work with fee reduced amount from here.
        );

        // Assets sent out are newly minted debt and/or "swap" owned collateral.
        amountOut = cps().handleAssetsOut(_assetOut, valueIn, _receiver);

        // State modifications done, check MCR and slippage.
        _checkAndPayFee(_assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps into a leveraged amount of `_assetOut`.
     * @notice Receiver of assets is leverPositions.
     * @param _assetIn The asset that was leveraged.
     * @param _assetOut The asset that was provided.
     * @param _amountIn The amount of assetIn to swap.
     * @param _amountOutMin The minimum amount of assetOut to receive. For slippage protection.
     * @param _leverage The leverage of the position.
     * @return amountIn The amount of assetIn actually swapped after fees.
     * @return amountOut The amount of assetOut actually received.
     */
    function _swapLeverIn(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _leverage
    ) internal returns (uint256 amountIn, uint256 amountOut) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);

        // Get the fees adjusted for leverage taken.
        uint256 feeAmount = _amountIn.wadMul(_leverage).wadMul(feePercentage);
        amountIn = _amountIn - feeAmount; // Work with fee reduced amount from here.

        // Not leverage adjusted.
        uint256 valueIn = cps().handleAssetsIn(_assetIn, amountIn).wadMul(_leverage);

        // We multiply value by leverage to get the amount of debt to mint.
        amountOut = cps().handleAssetsOut(_assetOut, valueIn, address(cps().leverPositions));

        _checkAndPayFee(_assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps a leveraged position back to unleveraged amount of provided asset.
     * @param _receiver The address to receive the collateral.
     * @param _assetIn The asset that was leveraged.
     * @param _assetOut The asset that was provided.
     * @param _amountIn The amount of assetIn to swap.
     * @param _amountOutMin The minimum amount of assetOut to receive. For slippage protection.
     * @param _leverage The leverage of the position.
     */
    function _swapLeverOut(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _leverage
    ) internal returns (uint256 amountIn, uint256 amountOut) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);

        // Get the fees with leverage. Trader pays these fees.
        uint256 feeAmount = _amountIn.wadMul(feePercentage);
        amountIn = _amountIn - feeAmount; // Work with fee reduced amount from here.

        // Not leverage adjusted.
        uint256 valueIn = cps().handleAssetsIn(_assetIn, amountIn).wadDiv(_leverage);

        // We reduce value out here, as it was increased on the way in.
        amountOut = cps().handleAssetsOut(_assetOut, valueIn, _receiver);

        _checkAndPayFee(_assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    function _checkAndPayFee(
        address _assetIn,
        uint256 _amountOut,
        uint256 _amountOutMin,
        uint256 _feeAmount,
        uint256 _protocolFee
    ) private {
        // State modifications done, check MCR and slippage.
        require(_amountOut >= _amountOutMin, "lev-swap-slippage");
        require(cps().checkRatio(cps().minimumCollateralizationRatio), "lev-swap-mcr-violation");

        // Send fees to the fee receivers.
        uint256 protocolFeeTaken = _feeAmount.wadMul(_protocolFee);
        _feeAmount -= protocolFeeTaken;

        IERC20Permit(_assetIn).safeTransfer(cps().swapFeeRecipient, _feeAmount);
        IERC20Permit(_assetIn).safeTransfer(ms().feeRecipient, protocolFeeTaken);

        emit SwapFee(_assetIn, _feeAmount, protocolFeeTaken);
    }
}