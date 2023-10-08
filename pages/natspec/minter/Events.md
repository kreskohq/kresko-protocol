# Solidity API

## MEvent

### CollateralAssetAdded

```solidity
event CollateralAssetAdded(string id, address collateralAsset, uint256 factor, address anchor, uint256 liqIncentive)
```

Emitted when a collateral asset is added to the protocol.

_Can only be emitted once for a given collateral asset._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | string |  |
| collateralAsset | address | The address of the collateral asset. |
| factor | uint256 | The collateral factor. |
| anchor | address |  |
| liqIncentive | uint256 | The liquidation incentive |

### CollateralAssetUpdated

```solidity
event CollateralAssetUpdated(string id, address collateralAsset, uint256 factor, address anchor, uint256 liqIncentive)
```

Emitted when a collateral asset is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | string |  |
| collateralAsset | address | The address of the collateral asset. |
| factor | uint256 | The collateral factor. |
| anchor | address |  |
| liqIncentive | uint256 | The liquidation incentive |

### CollateralDeposited

```solidity
event CollateralDeposited(address account, address collateralAsset, uint256 amount)
```

Emitted when an account deposits collateral.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account depositing collateral. |
| collateralAsset | address | The address of the collateral asset. |
| amount | uint256 | The amount of the collateral asset that was deposited. |

### CollateralWithdrawn

```solidity
event CollateralWithdrawn(address account, address collateralAsset, uint256 amount)
```

Emitted when an account withdraws collateral.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account withdrawing collateral. |
| collateralAsset | address | The address of the collateral asset. |
| amount | uint256 | The amount of the collateral asset that was withdrawn. |

### UncheckedCollateralWithdrawn

```solidity
event UncheckedCollateralWithdrawn(address account, address collateralAsset, uint256 amount)
```

Emitted when AMM helper withdraws account collateral without MCR checks.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account withdrawing collateral. |
| collateralAsset | address | The address of the collateral asset. |
| amount | uint256 | The amount of the collateral asset that was withdrawn. |

### AMMOracleUpdated

```solidity
event AMMOracleUpdated(address ammOracle)
```

Emitted when AMM oracle is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ammOracle | address | The address of the AMM oracle. |

### KreskoAssetAdded

```solidity
event KreskoAssetAdded(string id, address kreskoAsset, address anchor, uint256 kFactor, uint256 supplyLimit, uint256 closeFee, uint256 openFee)
```

Emitted when a KreskoAsset is added to the protocol.

_Can only be emitted once for a given Kresko asset._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | string |  |
| kreskoAsset | address | The address of the Kresko asset. |
| anchor | address | anchor token |
| kFactor | uint256 | The k-factor. |
| supplyLimit | uint256 | The total supply limit. |
| closeFee | uint256 | The close fee percentage. |
| openFee | uint256 | The open fee percentage. |

### KreskoAssetUpdated

```solidity
event KreskoAssetUpdated(string id, address kreskoAsset, address anchor, uint256 kFactor, uint256 supplyLimit, uint256 closeFee, uint256 openFee)
```

Emitted when a Kresko asset's oracle is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | string |  |
| kreskoAsset | address | The address of the Kresko asset. |
| anchor | address |  |
| kFactor | uint256 | The k-factor. |
| supplyLimit | uint256 | The total supply limit. |
| closeFee | uint256 | The close fee percentage. |
| openFee | uint256 | The open fee percentage. |

### KreskoAssetMinted

```solidity
event KreskoAssetMinted(address account, address kreskoAsset, uint256 amount)
```

Emitted when an account mints a Kresko asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account minting the Kresko asset. |
| kreskoAsset | address | The address of the Kresko asset. |
| amount | uint256 | The amount of the KreskoAsset that was minted. |

### KreskoAssetBurned

```solidity
event KreskoAssetBurned(address account, address kreskoAsset, uint256 amount)
```

Emitted when an account burns a Kresko asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account burning the Kresko asset. |
| kreskoAsset | address | The address of the Kresko asset. |
| amount | uint256 | The amount of the KreskoAsset that was burned. |

### DebtPositionClosed

```solidity
event DebtPositionClosed(address account, address kreskoAsset, uint256 amount)
```

Emitted when an account burns a Kresko asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account burning the Kresko asset. |
| kreskoAsset | address | The address of the Kresko asset. |
| amount | uint256 | The amount of the KreskoAsset that was burned. |

### CFactorUpdated

```solidity
event CFactorUpdated(address collateralAsset, uint256 cFactor)
```

Emitted when cFactor is updated for a collateral asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateralAsset | address | The address of the collateral asset. |
| cFactor | uint256 | The new cFactor |

### KFactorUpdated

```solidity
event KFactorUpdated(address kreskoAsset, uint256 kFactor)
```

Emitted when kFactor is updated for a KreskoAsset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| kreskoAsset | address | The address of the KreskoAsset. |
| kFactor | uint256 | The new kFactor |

### FeePaid

```solidity
event FeePaid(address account, address paymentCollateralAsset, uint256 feeType, uint256 paymentAmount, uint256 paymentValue, uint256 feeValue)
```

Emitted when an account pays an open/close fee with a collateral asset in the Minter.

_This can be emitted multiple times for a single asset._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Address of the account paying the fee. |
| paymentCollateralAsset | address | Address of the collateral asset used to pay the fee. |
| feeType | uint256 | Fee type. |
| paymentAmount | uint256 | Amount of ollateral asset that was paid. |
| paymentValue | uint256 | USD value of the payment. |
| feeValue | uint256 |  |

### LiquidationOccurred

```solidity
event LiquidationOccurred(address account, address liquidator, address repayKreskoAsset, uint256 repayAmount, address seizedCollateralAsset, uint256 collateralSent)
```

Emitted when a liquidation occurs.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account being liquidated. |
| liquidator | address | The account performing the liquidation. |
| repayKreskoAsset | address | The address of the KreskoAsset being paid back to the protocol by the liquidator. |
| repayAmount | uint256 | The amount of the repay KreskoAsset being paid back to the protocol by the liquidator. |
| seizedCollateralAsset | address | The address of the collateral asset being seized from the account by the liquidator. |
| collateralSent | uint256 | The amount of the seized collateral asset being seized from the account by the liquidator. |

### InterestLiquidationOccurred

```solidity
event InterestLiquidationOccurred(address account, address liquidator, address repayKreskoAsset, uint256 repayUSD, address seizedCollateralAsset, uint256 collateralSent)
```

Emitted when a liquidation of interest occurs.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account being liquidated. |
| liquidator | address | The account performing the liquidation. |
| repayKreskoAsset | address | The address of the KreskoAsset being paid back to the protocol by the liquidator. |
| repayUSD | uint256 | The value of the repay KreskoAsset being paid back to the protocol by the liquidator. |
| seizedCollateralAsset | address | The address of the collateral asset being seized from the account by the liquidator. |
| collateralSent | uint256 | The amount of the seized collateral asset being seized from the account by the liquidator. |

### BatchInterestLiquidationOccurred

```solidity
event BatchInterestLiquidationOccurred(address account, address liquidator, address seizedCollateralAsset, uint256 repayUSD, uint256 collateralSent)
```

Emitted when a batch liquidation of interest occurs.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account being liquidated. |
| liquidator | address | The account performing the liquidation. |
| seizedCollateralAsset | address | The address of the collateral asset being seized from the account by the liquidator. |
| repayUSD | uint256 | The value of the repay KreskoAsset being paid back to the protocol by the liquidator. |
| collateralSent | uint256 | The amount of the seized collateral asset being seized from the account by the liquidator. |

### SafetyStateChange

```solidity
event SafetyStateChange(enum Action action, address asset, string description)
```

Emitted when a safety state is triggered for an asset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| action | enum Action | Target action |
| asset | address | Asset affected |
| description | string | change description |

### FeeRecipientUpdated

```solidity
event FeeRecipientUpdated(address feeRecipient)
```

Emitted when the fee recipient is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeRecipient | address | The new fee recipient. |

### LiquidationIncentiveMultiplierUpdated

```solidity
event LiquidationIncentiveMultiplierUpdated(address asset, uint256 liqIncentiveMultiplier)
```

Emitted when the liquidation incentive multiplier is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The collateral asset being updated. |
| liqIncentiveMultiplier | uint256 | The new liquidation incentive multiplier raw value. |

### MaxLiquidationRatioUpdated

```solidity
event MaxLiquidationRatioUpdated(uint256 newMaxLiquidationRatio)
```

Emitted when the max liquidation ratio is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxLiquidationRatio | uint256 | The new max liquidation ratio. |

### MinimumCollateralizationRatioUpdated

```solidity
event MinimumCollateralizationRatioUpdated(uint256 minCollateralRatio)
```

Emitted when the minimum collateralization ratio is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minCollateralRatio | uint256 | The new minimum collateralization ratio raw value. |

### MinimumDebtValueUpdated

```solidity
event MinimumDebtValueUpdated(uint256 minDebtValue)
```

Emitted when the minimum debt value updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minDebtValue | uint256 | The new minimum debt value. |

### LiquidationThresholdUpdated

```solidity
event LiquidationThresholdUpdated(uint256 liquidationThreshold)
```

Emitted when the liquidation threshold value is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidationThreshold | uint256 | The new liquidation threshold value. |

