# Solidity API

## CModifiers

### onlyRole

```solidity
modifier onlyRole(bytes32 role)
```

_Modifier that checks that an account has a specific role. Reverts
with a standardized message including the required role.

The format of the revert reason is given by the following regular expression:

 /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/

_Available since v4.1.__

### onlyRoleIf

```solidity
modifier onlyRoleIf(bool _accountIsNotMsgSender, bytes32 role)
```

Ensure only trusted contracts can act on behalf of `_account`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accountIsNotMsgSender | bool | The address of the collateral asset. |
| role | bytes32 |  |

### nonReentrant

```solidity
modifier nonReentrant()
```

### isCollateral

```solidity
modifier isCollateral(address _assetAddr)
```

Reverts if address is not a collateral asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The address of the asset. |

### isKrAsset

```solidity
modifier isKrAsset(address _assetAddr)
```

Reverts if address is not a Kresko Asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The address of the asset. |

### isSCDPDepositAsset

```solidity
modifier isSCDPDepositAsset(address _assetAddr)
```

Reverts if address is not a Kresko Asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The address of the asset. |

### isSCDPKrAsset

```solidity
modifier isSCDPKrAsset(address _assetAddr)
```

Reverts if address is not a Kresko Asset.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetAddr | address | The address of the asset. |

### gate

```solidity
modifier gate()
```

Reverts if the caller does not have the required NFT's for the gated phase

### ensureNotPaused

```solidity
function ensureNotPaused(address _assetAddr, enum Action _action) internal view virtual
```

_Simple check for the enabled flag_

