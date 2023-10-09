# Solidity API

## LiquidationFacet

Main end-user functionality concerning liquidations within Kresko's Minter system.

### liquidate

```solidity
function liquidate(address _account, address _repayAssetAddr, uint256 _repayAmount, address _seizeAssetAddr, uint256 _repayAssetIndex, uint256 _seizeAssetIndex) external
```

Attempts to liquidate an account by repaying the portion of the account's Kresko asset
debt, receiving in return a portion of the account's collateral at a discounted rate.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to attempt to liquidate. |
| _repayAssetAddr | address | Address of the Kresko asset to be repaid. |
| _repayAmount | uint256 | Amount of the Kresko asset to be repaid. |
| _seizeAssetAddr | address | Address of the collateral asset to be seized. |
| _repayAssetIndex | uint256 | Index of the Kresko asset in the account's minted assets array. |
| _seizeAssetIndex | uint256 | Index of the collateral asset in the account's collateral assets array. |

### getMaxLiqValue

```solidity
function getMaxLiqValue(address _account, address _repayAssetAddr, address _seizeAssetAddr) external view returns (struct MaxLiqInfo)
```

_Calculates the total value that is allowed to be liquidated from an account (if it is liquidatable)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Address of the account to liquidate |
| _repayAssetAddr | address | Address of Kresko Asset to repay |
| _seizeAssetAddr | address | Address of Collateral to seize |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct MaxLiqInfo | MaxLiqInfo Calculated information about the maximum liquidation. |

### _liquidateAssets

```solidity
function _liquidateAssets(struct Asset collateral, struct Asset krAsset, struct ILiquidationFacet.ExecutionParams params) internal returns (uint256 seizedAmount)
```

### _getMaxLiqValue

```solidity
function _getMaxLiqValue(address _account, struct Asset _repayAsset, struct Asset _seizeAsset, address _seizeAssetAddr) internal view returns (uint256 maxValue)
```

### _calcMaxLiqValue

```solidity
function _calcMaxLiqValue(struct Asset _repayAsset, struct Asset _seizeAsset, uint256 _minCollateralValue, uint256 _totalCollateralValue, uint256 _seizeAssetValue, uint96 _minDebtValue, uint32 _maxLiquidationRatio) internal view returns (uint256)
```

