# Solidity API

## SAccounts

### accountScaledDeposits

```solidity
function accountScaledDeposits(struct SCDPState self, address _account, address _assetAddr, struct Asset _asset) internal view returns (uint256)
```

Get accounts deposit amount that is scaled by the liquidity index.
The liquidity index is updated when: A) Income is accrued B) Liquidation occurs.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _account | address | The account to get the amount for |
| _assetAddr | address | The asset address |
| _asset | struct Asset | The asset struct |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Amount of scaled debt. |

### accountPrincipalDeposits

```solidity
function accountPrincipalDeposits(struct SCDPState self, address _account, address _assetAddr, struct Asset _asset) internal view returns (uint256 principalDeposits)
```

Get accounts principal deposits.
Uses scaled deposits if its lower than principal (realizing liquidations).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _account | address | The account to get the amount for |
| _assetAddr | address | The deposit asset address |
| _asset | struct Asset | The deposit asset struct |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| principalDeposits | uint256 | The principal deposit amount for the account. |

### accountTotalDepositValue

```solidity
function accountTotalDepositValue(struct SCDPState self, address _account, bool _ignoreFactors) internal view returns (uint256 totalValue)
```

Returns the value of the deposits for `_account`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _account | address | Account to get total deposit value for |
| _ignoreFactors | bool | Whether to ignore cFactor and kFactor |

### accountTotalScaledDepositsValue

```solidity
function accountTotalScaledDepositsValue(struct SCDPState self, address _account) internal view returns (uint256 totalValue)
```

Returns the value of the collateral assets in the pool for `_account` for the scaled deposit amount.
Ignores all factors.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _account | address | account |

