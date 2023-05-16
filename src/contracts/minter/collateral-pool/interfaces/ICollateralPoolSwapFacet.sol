// SDPX-License-Identifier: MIT
pragma solidity >=0.8.14;

interface ICollateralPoolSwapFacet {
    event Swap(
        address indexed who,
        address indexed assetIn,
        address indexed assetOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event SwapFee(address indexed assetIn, uint256 feeAmount, uint256 protocolFeeAmount);

    /**
     * @notice Swap kresko assets with KISS using the shared collateral pool.
     * Uses oracle pricing of _amountIn to determine how much _assetOut to send.
     * @param _receiver The receiver of amount out.
     * @param _assetIn The asset to pay with.
     * @param _assetOut The asset to receive.
     * @param _amountIn The amount of _assetIn to pay.
     * @param _amountOutMin The minimum amount of _assetOut to receive, this is due to possible oracle price change.
     */
    function swap(
        address _receiver,
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) external;
}
