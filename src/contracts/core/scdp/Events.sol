// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

library SEvent {
    event SCDPDeposit(address indexed depositor, address indexed collateralAsset, uint256 amount);
    event SCDPWithdraw(address indexed withdrawer, address indexed collateralAsset, uint256 amount, uint256 feeAmount);
    event SCDPRepay(
        address indexed repayer,
        address indexed repayKreskoAsset,
        uint256 repayAmount,
        address indexed receiveKreskoAsset,
        uint256 receiveAmount
    );

    event SCDPLiquidationOccured(
        address indexed liquidator,
        address indexed repayKreskoAsset,
        uint256 repayAmount,
        address indexed seizeCollateral,
        uint256 seizeAmount
    );

    // Emitted when a swap pair is disabled / enabled.
    event PairSet(address indexed assetIn, address indexed assetOut, bool enabled);
    // Emitted when a kresko asset fee is updated.
    event FeeSet(address indexed _asset, uint256 openFee, uint256 closeFee, uint256 protocolFee);

    // Emitted when a collateral is updated.
    event SCDPCollateralUpdated(address indexed _asset, uint256 liquidationThreshold);

    // Emitted when a kresko asset is updated.
    event SCDPKrAssetUpdated(address indexed _asset, uint64 openFee, uint64 closeFee, uint128 protocolFee, uint256 supplyLimit);

    event Swap(address indexed who, address indexed assetIn, address indexed assetOut, uint256 amountIn, uint256 amountOut);
    event SwapFee(address indexed feeAsset, address indexed assetIn, uint256 feeAmount, uint256 protocolFeeAmount);

    event Income(address asset, uint256 amount);
}
