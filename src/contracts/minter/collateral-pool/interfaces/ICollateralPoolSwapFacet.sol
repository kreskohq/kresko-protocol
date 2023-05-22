// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {Position, NewPosition} from "../position/state/PositionsStorage.sol";

interface ICollateralPoolSwapFacet {
    event Swap(
        address indexed who,
        address indexed assetIn,
        address indexed assetOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event SwapFee(address indexed assetIn, uint256 feeAmount, uint256 protocolFeeAmount);

    event Income(address asset, uint256 amount);

    /// @notice Get a price for an asset. It is `extOracleDecimals()` of precision.
    function getPrice(address _asset) external view returns (uint256 price);

    /**
     * @notice Preview the amount out received.
     * @param _assetIn The asset to pay with.
     * @param _assetOut The asset to receive.
     * @param _amountIn The amount of _assetIn to pay.
     * @param _leverage The leverage to use. 1e18 = 1x, 2e18 = 2x, etc.
     * @return amountOut The amount of `_assetOut` to receive according to `_amountIn`.
     */
    function previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _leverage
    ) external view returns (uint256 amountOut, uint256 feeAmount, uint256 protocolFee);

    /**
     * @notice Swap kresko assets with KISS using the shared collateral pool.
     * Uses oracle pricing of _amountIn to determine how much _assetOut to send.
     * @param _account The receiver of amount out.
     * @param _assetIn The asset to pay with.
     * @param _assetOut The asset to receive.
     * @param _amountIn The amount of _assetIn to pay.
     * @param _amountOutMin The minimum amount of _assetOut to receive, this is due to possible oracle price change.
     */
    function swap(
        address _account,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) external;

    /**
     * @notice Swap in to leverage. This is only callable by the positions NFT.
     * @param _sender The account that funds the position.
     * @param _position The position to swap into.
     * @return amountInAfterFee Amount in after fees are paid.
     * @return amountOut Amount of `_assetOut` received.
     */
    function swapLeverIn(
        address _sender,
        NewPosition memory _position
    ) external returns (uint256 amountInAfterFee, uint256 amountOut);

    /**
     * @notice Swaps out of leverage. This is only callable by the positions NFT.
     * @notice Called by the position contract.
     * @param _position The position to swap out of.
     * @return amountOut The amount of `_assetOut` to receive.
     */
    function swapLeverOut(Position memory _position) external returns (uint256 amountOut);

    /// @notice Swaps out of leverage, liquidation or closing.
    function swapLeverOutLiquidation(
        address _incentiveReceiver,
        Position memory _position
    ) external returns (uint256 amountOut, uint256 amountOutIncentive);

    /**
     * @notice Accumulates fees to deposits as a fixed, instantaneous income.
     * @param _incomeAsset the income asset
     * @param _amount amount to accumulate
     */
    function cumulateIncome(address _incomeAsset, uint256 _amount) external;
}
