# Solidity API

## SCDPFacet

### depositSCDP

```solidity
function depositSCDP(address _account, address _collateralAsset, uint256 _amount) external
```

Deposit collateral for account to the collateral pool.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to deposit for. |
| _collateralAsset | address | The collateral asset to deposit. |
| _amount | uint256 | The amount to deposit. |

### withdrawSCDP

```solidity
function withdrawSCDP(address _account, address _collateralAsset, uint256 _amount) external
```

Withdraw collateral for account from the collateral pool.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The account to withdraw for. |
| _collateralAsset | address | The collateral asset to withdraw. |
| _amount | uint256 | The amount to withdraw. |

### repaySCDP

```solidity
function repaySCDP(address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr) external
```

Repay debt for no fees or slippage.
Only uses swap deposits, if none available, reverts.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _repayAssetAddr | address | The asset to repay the debt in. |
| _repayAmount | uint256 | The amount of the asset to repay the debt with. |
| _seizeAssetAddr | address | The collateral asset to seize. |

### getLiquidatableSCDP

```solidity
function getLiquidatableSCDP() external view returns (bool)
```

### getMaxLiqValueSCDP

```solidity
function getMaxLiqValueSCDP(address _repayAssetAddr, address _seizeAssetAddr) external view returns (struct MaxLiqInfo)
```

_Calculates the total value that is allowed to be liquidated from SCDP (if it is liquidatable)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _repayAssetAddr | address | Address of Kresko Asset to repay |
| _seizeAssetAddr | address | Address of Collateral to seize |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct MaxLiqInfo | MaxLiqInfo Calculated information about the maximum liquidation. |

### liquidateSCDP

```solidity
function liquidateSCDP(address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr) external
```

Liquidate the collateral pool.
Adjusts everyones deposits if swap deposits do not cover the seized amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _repayAssetAddr | address | The asset to repay the debt in. |
| _repayAmount | uint256 | The amount of the asset to repay the debt with. |
| _seizeAssetAddr | address | The collateral asset to seize. |

### _getMaxLiqValue

```solidity
function _getMaxLiqValue(struct Asset _repayAsset, struct Asset _seizeAsset, address _seizeAssetAddr) internal view returns (uint256 maxLiquidatableUSD)
```

### _calcMaxLiqValue

```solidity
function _calcMaxLiqValue(struct Asset _repayAsset, struct Asset _seizeAsset, uint256 _minCollateralValue, uint256 _totalCollateralValue, uint256 _seizeAssetValue, uint96 _minDebtValue, uint32 _maxLiquidationRatio) internal view returns (uint256)
```

