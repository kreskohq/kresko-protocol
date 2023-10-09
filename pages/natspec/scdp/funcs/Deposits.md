# Solidity API

## SDeposits

### handleDepositSCDP

```solidity
function handleDepositSCDP(struct SCDPState self, address _account, address _assetAddr, uint256 _amount) internal
```

Records a deposit of collateral asset.

_Saves principal, scaled and global deposit amounts._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _account | address | depositor |
| _assetAddr | address | the deposit asset |
| _amount | uint256 | amount of collateral asset to deposit |

### handleWithdrawSCDP

```solidity
function handleWithdrawSCDP(struct SCDPState self, address _account, address _assetAddr, uint256 _amount) internal returns (uint256 amountOut, uint256 feesOut)
```

Records a withdrawal of collateral asset from the SCDP.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _account | address | The withdrawing account |
| _assetAddr | address | the deposit asset |
| _amount | uint256 | The amount of collateral withdrawn |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The actual amount of collateral withdrawn |
| feesOut | uint256 | The fees paid for during the withdrawal |

### handleSeizeSCDP

```solidity
function handleSeizeSCDP(struct SCDPState self, address _sAssetAddr, struct Asset _sAsset, uint256 _seizeAmount) internal
```

This function seizes collateral from the shared pool
Adjusts all deposits in the case where swap deposits do not cover the amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _sAssetAddr | address | The seized asset address. |
| _sAsset | struct Asset | The asset struct (Asset). |
| _seizeAmount | uint256 | The seize amount (uint256). |

