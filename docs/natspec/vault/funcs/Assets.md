# Solidity API

## VAssets

Helper library for KreskoVault

### price

```solidity
function price(struct VaultAsset self) internal view returns (uint256)
```

get price of an asset from the oracle speficied.

### handleDepositFee

```solidity
function handleDepositFee(struct VaultAsset self, uint256 assets) internal pure returns (uint256 assetsWithFee, uint256 fee)
```

get price of an asset from the oracle speficied.

### handleMintFee

```solidity
function handleMintFee(struct VaultAsset self, uint256 assets) internal pure returns (uint256 assetsWithFee, uint256 fee)
```

get price of an asset from the oracle speficied.

### handleWithdrawFee

```solidity
function handleWithdrawFee(struct VaultAsset self, uint256 assets) internal pure returns (uint256 assetsWithFee, uint256 fee)
```

get price of an asset from the oracle speficied.

### handleRedeemFee

```solidity
function handleRedeemFee(struct VaultAsset self, uint256 assets) internal pure returns (uint256 assetsWithFee, uint256 fee)
```

get price of an asset from the oracle speficied.

### oracleToWad

```solidity
function oracleToWad(uint256 value, uint8 oracleDecimals) internal pure returns (uint256)
```

convert oracle decimal precision value to wad.

### wadToOracle

```solidity
function wadToOracle(uint256 tokenPrice, uint8 oracleDecimals) internal pure returns (uint256)
```

convert wad precision value to oracle precision.

### usdWad

```solidity
function usdWad(struct VaultAsset self, uint256 amount, uint8 oracleDecimals) internal view returns (uint256)
```

get oracle decimal precision USD value for `amount`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct VaultAsset |  |
| amount | uint256 | amount of tokens to get USD value for. |
| oracleDecimals | uint8 |  |

### usdRay

```solidity
function usdRay(struct VaultAsset self, uint256 amount, uint8 oracleDecimals) internal view returns (uint256)
```

get oracle decimal precision USD value for `amount`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct VaultAsset |  |
| amount | uint256 | amount of tokens to get USD value for. |
| oracleDecimals | uint8 |  |

### usd

```solidity
function usd(struct VaultAsset self, uint256 amount) internal view returns (uint256)
```

get oracle decimal precision USD value for `amount`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct VaultAsset |  |
| amount | uint256 | amount of tokens to get USD value for. |

### getDepositValue

```solidity
function getDepositValue(struct VaultAsset self) internal view returns (uint256)
```

get total deposit value of `self` in USD, oracle precision.

### getDepositValueWad

```solidity
function getDepositValueWad(struct VaultAsset self, uint8 oracleDecimals) internal view returns (uint256)
```

get total deposit value of `self` in USD, oracle precision.

### getAmount

```solidity
function getAmount(struct VaultAsset self, uint256 value, uint8 oracleDecimals) internal view returns (uint256)
```

get a token amount for `value` USD, oracle precision.

### wadToTokenAmount

```solidity
function wadToTokenAmount(address token, uint256 wad) internal view returns (uint256)
```

converts wad precision amount `wad` to token decimal precision.

### tokenAmountToWad

```solidity
function tokenAmountToWad(address token, uint256 amount) internal view returns (uint256)
```

converts token decimal precision `amount` to wad precision.

