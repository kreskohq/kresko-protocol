# Solidity API

## SEvent

### SCDPDeposit

```solidity
event SCDPDeposit(address depositor, address collateralAsset, uint256 amount)
```

### SCDPWithdraw

```solidity
event SCDPWithdraw(address withdrawer, address collateralAsset, uint256 amount, uint256 feeAmount)
```

### SCDPRepay

```solidity
event SCDPRepay(address repayer, address repayKreskoAsset, uint256 repayAmount, address receiveKreskoAsset, uint256 receiveAmount)
```

### SCDPLiquidationOccured

```solidity
event SCDPLiquidationOccured(address liquidator, address repayKreskoAsset, uint256 repayAmount, address seizeCollateral, uint256 seizeAmount)
```

### PairSet

```solidity
event PairSet(address assetIn, address assetOut, bool enabled)
```

### FeeSet

```solidity
event FeeSet(address _asset, uint256 openFee, uint256 closeFee, uint256 protocolFee)
```

### SCDPCollateralUpdated

```solidity
event SCDPCollateralUpdated(address _asset, uint256 liquidationThreshold)
```

### SCDPKrAssetUpdated

```solidity
event SCDPKrAssetUpdated(address _asset, uint64 openFee, uint64 closeFee, uint128 protocolFee, uint256 supplyLimit)
```

### Swap

```solidity
event Swap(address who, address assetIn, address assetOut, uint256 amountIn, uint256 amountOut)
```

### SwapFee

```solidity
event SwapFee(address feeAsset, address assetIn, uint256 feeAmount, uint256 protocolFeeAmount)
```

### Income

```solidity
event Income(address asset, uint256 amount)
```

