# Solidity API

## SCDPState

```solidity
struct SCDPState {
  address[] collaterals;
  address[] krAssets;
  mapping(address => mapping(address => bool)) isSwapEnabled;
  mapping(address => bool) isEnabled;
  mapping(address => struct SCDPAssetData) assetData;
  mapping(address => mapping(address => uint256)) deposits;
  mapping(address => mapping(address => uint256)) depositsPrincipal;
  address feeAsset;
  uint32 minCollateralRatio;
  uint32 liquidationThreshold;
  uint32 maxLiquidationRatio;
  address swapFeeRecipient;
}
```

## SDIState

```solidity
struct SDIState {
  uint256 totalDebt;
  uint256 totalCover;
  address coverRecipient;
  address[] coverAssets;
  uint8 sdiPricePrecision;
}
```

## SCDP_STORAGE_POSITION

```solidity
bytes32 SCDP_STORAGE_POSITION
```

## SDI_STORAGE_POSITION

```solidity
bytes32 SDI_STORAGE_POSITION
```

## scdp

```solidity
function scdp() internal pure returns (struct SCDPState state)
```

## sdi

```solidity
function sdi() internal pure returns (struct SDIState state)
```

