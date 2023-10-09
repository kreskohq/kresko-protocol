# Solidity API

## MinterAccountState

```solidity
struct MinterAccountState {
  uint256 totalDebtValue;
  uint256 totalCollateralValue;
  uint256 collateralRatio;
}
```

## MinterInitArgs

Initialization arguments for the protocol

```solidity
struct MinterInitArgs {
  uint32 liquidationThreshold;
  uint32 minCollateralRatio;
}
```

## MinterParams

Configurable parameters within the protocol

```solidity
struct MinterParams {
  uint32 minCollateralRatio;
  uint32 liquidationThreshold;
  uint32 maxLiquidationRatio;
}
```

## MinterFee

_Fee types

Open = 0
Close = 1_

```solidity
enum MinterFee {
  Open,
  Close
}
```

