# Solidity API

## ILiquidationFacet

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

### ExecutionParams

Internal, used execute _liquidateAssets.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct ExecutionParams {
  address account;
  uint256 repayAmount;
  uint256 seizeAmount;
  address repayAssetAddr;
  uint256 repayAssetIndex;
  address seizedAssetAddr;
  uint256 seizedAssetIndex;
}
```

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

