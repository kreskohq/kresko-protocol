# Solidity API

## IConfigurationFacet

### initializeMinter

```solidity
function initializeMinter(struct MinterInitArgs args) external
```

### updateLiquidationIncentive

```solidity
function updateLiquidationIncentive(address _collateralAsset, uint16 _newLiquidationIncentive) external
```

Updates the liquidation incentive multiplier.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collateralAsset | address | The collateral asset to update. |
| _newLiquidationIncentive | uint16 | The new liquidation incentive multiplier for the asset. |

### updateCollateralFactor

```solidity
function updateCollateralFactor(address _collateralAsset, uint16 _newFactor) external
```

Updates the cFactor of a KreskoAsset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collateralAsset | address | The collateral asset. |
| _newFactor | uint16 | The new collateral factor. |

### updateKFactor

```solidity
function updateKFactor(address _kreskoAsset, uint16 _kFactor) external
```

Updates the kFactor of a KreskoAsset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _kreskoAsset | address | The KreskoAsset. |
| _kFactor | uint16 | The new kFactor. |

### updateMinCollateralRatio

```solidity
function updateMinCollateralRatio(uint32 _newMinCollateralRatio) external
```

_Updates the contract's collateralization ratio._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newMinCollateralRatio | uint32 | The new minimum collateralization ratio as wad. |

### updateLiquidationThreshold

```solidity
function updateLiquidationThreshold(uint32 _newThreshold) external
```

_Updates the contract's liquidation threshold value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newThreshold | uint32 | The new liquidation threshold value |

### updateMaxLiquidationRatio

```solidity
function updateMaxLiquidationRatio(uint32 _newMaxLiquidationRatio) external
```

Updates the max liquidation ratior value.
This is the maximum collateral ratio that liquidations can liquidate to.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newMaxLiquidationRatio | uint32 | Percent value in wad precision. |

