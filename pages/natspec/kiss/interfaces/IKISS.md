# Solidity API

## IKISS

### issue

```solidity
function issue(uint256 _amount, address _to) external returns (uint256)
```

This function adds KISS to circulation
Caller must be a contract and have the OPERATOR_ROLE

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount to mint |
| _to | address | address to mint tokens to |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 amount minted |

### destroy

```solidity
function destroy(uint256 _amount, address _from) external returns (uint256)
```

This function removes KISS from circulation
Caller must be a contract and have the OPERATOR_ROLE

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount to burn |
| _from | address | address to burn tokens from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 amount burned |

### pause

```solidity
function pause() external
```

Triggers stopped state.

Requirements:

- The contract must not be paused.

### unpause

```solidity
function unpause() external
```

Returns to normal state.

Requirements:

- The contract must be paused.

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256 rate)
```

Exchange rate of vKISS to USD.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | uint256 | vKISS/USD exchange rate. |

### grantRole

```solidity
function grantRole(bytes32 _role, address _to) external
```

Overrides `AccessControl.grantRole` for following:
EOA cannot be granted Role.OPERATOR role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _role | bytes32 | role to grant |
| _to | address | address to grant role for |

