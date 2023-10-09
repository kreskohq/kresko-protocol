# Solidity API

## SCDPInitArgs

SCDP initializer configuration.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct SCDPInitArgs {
  address swapFeeRecipient;
  uint32 minCollateralRatio;
  uint32 liquidationThreshold;
  uint8 sdiPricePrecision;
}
```

## PairSetter

```solidity
struct PairSetter {
  address assetIn;
  address assetOut;
  bool enabled;
}
```

## SCDPAssetData

```solidity
struct SCDPAssetData {
  uint256 debt;
  uint128 totalDeposits;
  uint128 swapDeposits;
}
```

## GlobalData

```solidity
struct GlobalData {
  uint256 collateralValue;
  uint256 collateralValueAdjusted;
  uint256 debtValue;
  uint256 debtValueAdjusted;
  uint256 effectiveDebtValue;
  uint256 cr;
  uint256 crDebtValue;
  uint256 crDebtValueAdjusted;
}
```

## AssetData

Periphery asset data

```solidity
struct AssetData {
  address addr;
  uint256 depositAmount;
  uint256 depositValue;
  uint256 depositValueAdjusted;
  uint256 debtAmount;
  uint256 debtValue;
  uint256 debtValueAdjusted;
  uint256 swapDeposits;
  struct Asset asset;
  uint256 assetPrice;
  string symbol;
}
```

## UserAssetData

```solidity
struct UserAssetData {
  address asset;
  uint256 assetPrice;
  uint256 depositAmount;
  uint256 scaledDepositAmount;
  uint256 depositValue;
  uint256 scaledDepositValue;
}
```

## UserData

```solidity
struct UserData {
  address account;
  uint256 totalDepositValue;
  uint256 totalScaledDepositValue;
  uint256 totalFeesValue;
  struct UserAssetData[] deposits;
}
```

