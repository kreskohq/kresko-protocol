# Solidity API

## SDebtIndex

### valueToSDI

```solidity
function valueToSDI(uint256 valueIn, uint8 oracleDecimals) internal view returns (uint256)
```

### cover

```solidity
function cover(struct SDIState self, address coverAssetAddr, uint256 amount) internal returns (uint256 shares, uint256 value)
```

Cover by pulling assets.

### effectiveDebt

```solidity
function effectiveDebt(struct SDIState self) internal view returns (uint256)
```

Returns the total effective debt amount of the SCDP.

### effectiveDebtValue

```solidity
function effectiveDebtValue(struct SDIState self) internal view returns (uint256)
```

Returns the total effective debt value of the SCDP.

### totalCoverAmount

```solidity
function totalCoverAmount(struct SDIState self) internal view returns (uint256)
```

### totalCoverValue

```solidity
function totalCoverValue(struct SDIState self) internal view returns (uint256 result)
```

Gets the total cover debt value, oracle precision

### totalSDI

```solidity
function totalSDI(struct SDIState self) internal view returns (uint256)
```

Simply returns the total supply of SDI.

### coverAssetValue

```solidity
function coverAssetValue(struct SDIState self, address _assetAddr) internal view returns (uint256)
```

Get total deposit value of `asset` in USD, oracle precision.

