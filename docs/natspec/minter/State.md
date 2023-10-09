# Solidity API

## MinterState

```solidity
struct MinterState {
  mapping(address => address[]) depositedCollateralAssets;
  mapping(address => mapping(address => uint256)) collateralDeposits;
  mapping(address => mapping(address => uint256)) kreskoAssetDebt;
  mapping(address => address[]) mintedKreskoAssets;
  address[] krAssets;
  address[] collaterals;
  address feeRecipient;
  uint32 maxLiquidationRatio;
  uint32 minCollateralRatio;
  uint32 liquidationThreshold;
}
```

## MINTER_STORAGE_POSITION

```solidity
bytes32 MINTER_STORAGE_POSITION
```

## ms

```solidity
function ms() internal pure returns (struct MinterState state)
```

