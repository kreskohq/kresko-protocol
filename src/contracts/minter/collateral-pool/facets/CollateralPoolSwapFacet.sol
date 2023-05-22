// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {SafeERC20, IERC20Permit} from "../../../shared/SafeERC20.sol";
import {DiamondModifiers} from "../../../diamond/DiamondModifiers.sol";
import {ms} from "../../MinterStorage.sol";
import {WadRay} from "../../../libs/WadRay.sol";
import {ICollateralPoolSwapFacet} from "../interfaces/ICollateralPoolSwapFacet.sol";
import {cps} from "../CollateralPoolState.sol";
import {Position, NewPosition} from "../position/state/PositionsStorage.sol";

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
        address _sender,
        NewPosition memory _position
    ) external nonReentrant returns (uint256 amountInAfterFee, uint256 amountOut) {
        require(msg.sender == address(cps().positions), "closeLever-not-caller");
        require(_position.account != address(0), "receiver-invalid");
        require(_position.collateralAmount > 0, "swap-amount-zero");

        // Transfer collateral assets into this contract.
        IERC20Permit(_position.collateralAsset).safeTransferFrom(_sender, address(this), _position.collateralAmount);

        // Creating the position, sending it to leverPositions.
        (amountInAfterFee, amountOut) = _swapLeverIn(
            _position.collateralAsset,
            _position.borrowAsset,
            _position.collateralAmount,
            _position.borrowAmountMin,
            _position.leverage
        );

        emit Swap(msg.sender, _position.collateralAsset, _position.borrowAsset, _position.collateralAmount, amountOut);
    }

    // Closes a position, called by leverPositions
    function swapLeverOut(Position memory _position) external nonReentrant returns (uint256 amountOut) {
        require(msg.sender == address(cps().positions), "closeLever-not-caller");

        uint256 posCollateralAfterFees;
        // Swap out leveraged debt back to collateral.
        (, amountOut, posCollateralAfterFees) = _swapLeverOut(
            _position.borrowed,
            _position.collateral,
            _position.borrowedAmount,
            1,
            _position.collateralAmount,
            _position.leverage
        );
        emit Swap(msg.sender, _position.borrowed, _position.collateral, _position.borrowedAmount, amountOut);
        // increase by profit
        if (amountOut > posCollateralAfterFees) {
            amountOut = posCollateralAfterFees + (amountOut - posCollateralAfterFees).wadMul(_position.leverage);
            // decrease by losses
        } else if (amountOut < posCollateralAfterFees) {
            amountOut = posCollateralAfterFees - (posCollateralAfterFees - amountOut).wadMul(_position.leverage);
        }

        IERC20Permit(_position.collateral).safeTransfer(_position.account, amountOut);
    }

    function swapLeverOutLiquidation(
        address _incentiveReceiver,
        Position memory _position
    ) external nonReentrant returns (uint256 amountOut, uint256 amountOutIncentive) {
        require(msg.sender == address(cps().positions), "closeLever-not-caller");

        // Swap out leveraged debt back to collateral.
        uint256 posCollateralAfterFees;
        (, amountOut, posCollateralAfterFees) = _swapLeverOut(
            _position.borrowed,
            _position.collateral,
            _position.borrowedAmount,
            1,
            _position.collateralAmount,
            _position.leverage
        );

        emit Swap(msg.sender, _position.borrowed, _position.collateral, _position.borrowedAmount, amountOut);

        // increase by profit
        if (amountOut > posCollateralAfterFees) {
            uint256 total = posCollateralAfterFees + (amountOut - posCollateralAfterFees).wadMul(_position.leverage);

            amountOutIncentive = total.wadMul(_position.closeIncentive); // from total
            amountOut = total - amountOutIncentive;

            // decrease by losses, if insolvent, this will revert
        } else if (amountOut < posCollateralAfterFees) {
            uint256 total = posCollateralAfterFees - (posCollateralAfterFees - amountOut).wadMul(_position.leverage);

            amountOutIncentive = posCollateralAfterFees.wadMul(_position.liquidationIncentive); // from principal
            amountOut = total - amountOutIncentive;
        } else {
            revert("swapLeverOutLiquidation: no profit or loss");
        }

        IERC20Permit(_position.collateral).safeTransfer(_position.account, amountOut);
        IERC20Permit(_position.collateral).safeTransfer(_incentiveReceiver, amountOutIncentive);
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
            _amountIn - feeAmount, // Work with fee reduced amount from here.
            address(this)
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
        uint256 valueIn = cps().handleAssetsIn(_assetIn, amountIn, address(this)).wadMul(_leverage);

        // We multiply value by leverage to get the amount of debt to mint.
        amountOut = cps().handleAssetsOut(_assetOut, valueIn, address(cps().positions));

        _checkAndPayFee(_assetIn, amountOut, _amountOutMin, feeAmount, protocolFee);
    }

    /**
     * @notice Swaps a leveraged position back to unleveraged amount of provided asset.
     * @param _assetIn The asset that was leveraged.
     * @param _assetOut The asset that was provided.
     * @param _amountIn The amount of assetIn to swap.
     * @param _amountOutMin The minimum amount of assetOut to receive. For slippage protection.
     * @param _positionCollateralIn Position collateral amount, reduce fees from it when deducing loss/profit after.
     * @param _leverage The leverage of the position.
     */
    function _swapLeverOut(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _positionCollateralIn,
        uint256 _leverage
    ) internal returns (uint256 amountIn, uint256 amountOut, uint256 posCollateralAfterFees) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetIn, _assetOut);

        amountIn = _amountIn;

        // Not leverage adjusted.
        // We reduce value out here, as it was increased on the way in.
        uint256 valueIn = cps().handleAssetsIn(_assetIn, amountIn, address(cps().positions)).wadDiv(_leverage);

        amountOut = cps().handleAssetsOut(_assetOut, valueIn, address(this));

        // Get the fees adjusted for leveraged taken.
        uint256 feeAmount = amountOut.wadMul(_leverage).wadMul(feePercentage);

        amountOut = amountOut - feeAmount;
        posCollateralAfterFees = _positionCollateralIn - feeAmount;

        _checkAndPayFee(_assetOut, amountOut, _amountOutMin, feeAmount, protocolFee);
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

        // Send fees to the fee receivers.
        uint256 protocolFeeTaken = _feeAmount.wadMul(_protocolFee);
        _feeAmount -= protocolFeeTaken;

        IERC20Permit(_feeAsset).safeTransfer(cps().swapFeeRecipient, _feeAmount);
        IERC20Permit(_feeAsset).safeTransfer(ms().feeRecipient, protocolFeeTaken);

        emit SwapFee(_feeAsset, _feeAmount, protocolFeeTaken);
    }
}
