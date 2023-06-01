// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
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
    function swapIntoLeverage(
        address _sender,
        NewPosition memory _pos
    ) external nonReentrant returns (uint256 amountAFeeReduced, uint256 amountBOut) {
        require(msg.sender == address(cps().positions), "closeLever-not-caller");
        require(_pos.account != address(0), "receiver-invalid");
        require(_pos.amountA > 0, "swap-amount-zero");

        // Transfer collateral assets into this contract.
        IERC20Permit(_pos.assetA).safeTransferFrom(_sender, address(this), _pos.amountA);

        // Creating the position, sending it to leverPositions.
        (amountAFeeReduced, amountBOut) = _swapIntoLeverage(
            _pos.assetA,
            _pos.assetB,
            _pos.amountA,
            _pos.amountBMin,
            _pos.leverage
        );

        emit Swap(msg.sender, _pos.assetA, _pos.assetB, _pos.amountA, amountBOut);
    }

    // Closes a position, called by positions on closing a leveraged position.
    function swapOutOfLeverage(
        Position memory _pos,
        address _liquidator
    ) external nonReentrant returns (uint256 amountAOut) {
        require(msg.sender == address(cps().positions), "closeLever-not-caller");

        bool isProfit;
        // Swap out leveraged debt back to collateral.
        (amountAOut, isProfit) = _swapOutOfLeverage(_pos);

        emit Swap(msg.sender, _pos.assetB, _pos.assetA, _pos.amountB, amountAOut);

        // this is a position being closed by someone else
        // it has crossed either the liquidation threshold or the close threshold
        if (_liquidator != address(0)) {
            uint256 incentiveAOut = amountAOut.wadMul(
                isProfit ? _pos.closeIncentive : _pos.liquidationIncentive // from total
            );
            IERC20Permit(_pos.assetA).safeTransfer(_liquidator, incentiveAOut);
            amountAOut -= incentiveAOut;
        }

        IERC20Permit(_pos.assetA).safeTransfer(_pos.account, amountAOut);
    }

    function positionDepositA(address _to, uint256 _amountA, Position memory _pos) external nonReentrant {
        require(msg.sender == address(cps().positions), "deposit-not-caller");
        IERC20Permit(_pos.assetA).safeTransferFrom(_to, address(this), _amountA);
        cps().handleAssetsIn(_pos.assetA, _amountA, address(this));
    }

    function positionWithdrawA(address _from, uint256 _amountA, Position memory _pos) external nonReentrant {
        require(msg.sender == address(cps().positions), "deposit-not-caller");
        cps().handleAssetsOut(_pos.assetA, ms().kreskoAssets[_pos.assetA].uintUSD(_amountA), _from);
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
     * @param _assetA The asset that was provided.
     * @param _assetB The asset that was leveraged.
     * @param _amountAIn The amount of assetIn to swap.
     * @param _amountBOutMin The minimum amount of assetOut to receive. For slippage protection.
     * @param _leverage The leverage of the position.
     * @return amountAIn The amount of assetA actually swapped after fees.
     * @return amountBOut The amount of assetB actually received.
     */
    function _swapIntoLeverage(
        address _assetA,
        address _assetB,
        uint256 _amountAIn,
        uint256 _amountBOutMin,
        uint256 _leverage
    ) internal returns (uint256 amountAIn, uint256 amountBOut) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_assetA, _assetB);
        // Get the fees adjusted for leverage taken.
        uint256 feeAmountA = _amountAIn.wadMul(_leverage).wadMul(feePercentage);

        amountAIn = _amountAIn - feeAmountA; // Work with fee reduced amount from here.

        // Not leverage adjusted.
        uint256 valueAIn = cps().handleAssetsIn(_assetA, amountAIn, address(this)).wadMul(_leverage);

        // We multiply value by leverage to get the amount of debt to mint.
        amountBOut = cps().handleAssetsOut(_assetB, valueAIn, address(cps().positions));

        _checkAndPayFee(_assetA, amountBOut, _amountBOutMin, feeAmountA, protocolFee);
    }

    /**
     * @notice Swaps a leveraged position back to unleveraged amount of provided asset.
     * @param _pos The position to swap out.
     */
    function _swapOutOfLeverage(Position memory _pos) internal returns (uint256 amountAOut, bool isProfit) {
        // Check that assets can be swapped, get the fee percentages.
        (uint256 feePercentage, uint256 protocolFee) = cps().checkAssets(_pos.assetB, _pos.assetA);

        // We reduce value out here, as it was increased on the way in.
        uint256 valueBIn = cps().handleAssetsIn(_pos.assetB, _pos.amountB, address(cps().positions));

        amountAOut = cps().handleAssetsOut(_pos.assetA, valueBIn.wadDiv(_pos.leverage), address(this));

        // Get the fees adjusted for leveraged taken.
        uint256 feeAmountA = amountAOut.wadMul(feePercentage.wadMul(_pos.leverage));

        amountAOut = amountAOut - feeAmountA;
        uint256 principalAmountA = _pos.amountA - feeAmountA;

        // We do not need to check for CR, it will always go up.
        _payFee(_pos.assetA, feeAmountA, protocolFee);

        if (amountAOut > principalAmountA) {
            uint256 profits = (amountAOut - principalAmountA).wadMul(_pos.leverage - 1 ether); // 1x profit when swapping from.

            // increase by profit
            return (cps().handleProfitsOut(_pos.assetA, amountAOut, profits, _pos.account), true);
        } else if (amountAOut < principalAmountA) {
            uint256 losses = (principalAmountA - amountAOut).wadMul(_pos.leverage - 1 ether);
            cps().handleAssetsIn(_pos.assetA, losses, address(this));

            // decrease by losses
            return (amountAOut - losses, false);
        }
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
