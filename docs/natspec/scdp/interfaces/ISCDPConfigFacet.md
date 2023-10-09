# Solidity API

## ISCDPConfigFacet

### initializeSCDP

```solidity
function initializeSCDP(struct SCDPInitArgs _init) external
```

Initialize SCDP.
Callable by diamond owner only.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _init | struct SCDPInitArgs | The initial configuration. |

### getCurrentParametersSCDP

```solidity
function getCurrentParametersSCDP() external view returns (struct SCDPInitArgs)
```

Get the pool configuration.

### setFeeAssetSCDP

```solidity
function setFeeAssetSCDP(address asset) external
```

### setMinCollateralRatioSCDP

```solidity
function setMinCollateralRatioSCDP(uint32 _mcr) external
```

Set the pool minimum collateralization ratio.

### setLiquidationThresholdSCDP

```solidity
function setLiquidationThresholdSCDP(uint32 _lt) external
```

Set the pool liquidation threshold.

### setMaxLiquidationRatioSCDP

```solidity
function setMaxLiquidationRatioSCDP(uint32 _mlr) external
```

Set the pool max liquidation ratio.

### updateLiquidationIncentiveSCDP

```solidity
function updateLiquidationIncentiveSCDP(address _krAsset, uint16 _newLiquidationIncentive) external
```

Set the @param _newliqIncentive for @param _krAsset.

### updateDepositLimitSCDP

```solidity
function updateDepositLimitSCDP(address _asset, uint128 _newDepositLimit) external
```

Update the deposit asset limit configuration.
Only callable by admin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | address | The Collateral asset to update |
| _newDepositLimit | uint128 | The new deposit limit for the collateral emits PoolCollateralUpdated |

### setDepositAssetSCDP

```solidity
function setDepositAssetSCDP(address _assetAddr, bool _enabled) external
```

Disable or enable a deposit asset. Reverts if invalid asset.
Only callable by admin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | Asset to set. |
| _enabled | bool | Whether to enable or disable the asset. |

### setCollateralSCDP

```solidity
function setCollateralSCDP(address _assetAddr, bool _enabled) external
```

Disable or enable asset from collateral value calculations.
Reverts if invalid asset and if disabling asset that has user deposits.
Only callable by admin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | Asset to set. |
| _enabled | bool | Whether to enable or disable the asset. |

### setKrAssetSCDP

```solidity
function setKrAssetSCDP(address _assetAddr, bool _enabled) external
```

Disable or enable a kresko asset in SCDP.
Reverts if invalid asset. Enabling will also add it to collateral value calculations.
Only callable by admin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | Asset to set. |
| _enabled | bool | Whether to enable or disable the asset. |

### setSwapPairs

```solidity
function setSwapPairs(struct PairSetter[] _setters) external
```

Set whether pairs are enabled or not. Both ways.
Only callable by admin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _setters | struct PairSetter[] | The configurations to set. |

### setSwapPairsSingle

```solidity
function setSwapPairsSingle(struct PairSetter _setter) external
```

Set whether a swap pair is enabled or not.
Only callable by admin.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _setter | struct PairSetter | The configuration to set |

### setSwapFee

```solidity
function setSwapFee(address _krAsset, uint16 _openFee, uint16 _closeFee, uint16 _protocolFee) external
```

Sets the fees for a kresko asset

_Only callable by admin._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _krAsset | address | The kresko asset to set fees for. |
| _openFee | uint16 | The new open fee. |
| _closeFee | uint16 | The new close fee. |
| _protocolFee | uint16 | The protocol fee share. |

