// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface ISCDPSwapFacet {
    /// @notice Get a price for an asset. It is `extOracleDecimals()` of precision.
    function getPriceSCDP(address _asset) external view returns (uint256 price);

    /**
     * @notice Preview the amount out received.
     * @param _assetIn The asset to pay with.
     * @param _assetOut The asset to receive.
     * @param _amountIn The amount of _assetIn to pay.
     * @return amountOut The amount of `_assetOut` to receive according to `_amountIn`.
     */
    function previewSwapSCDP(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn
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
    function swapSCDP(address _account, address _assetIn, address _assetOut, uint256 _amountIn, uint256 _amountOutMin) external;

    /**
     * @notice Accumulates fees to deposits as a fixed, instantaneous income.
     * @param _incomeAsset the income asset
     * @param _amount amount to accumulate
     * @return nextLiquidityIndex the next liquidity index
     */
    function cumulateIncomeSCDP(address _incomeAsset, uint256 _amount) external returns (uint256 nextLiquidityIndex);
}
