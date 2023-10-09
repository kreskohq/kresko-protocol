# Solidity API

## IERC165Facet

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

Query if a contract implements an interface

_Interface identification is specified in ERC-165. This function
 uses less than 30,000 gas._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier, as specified in ERC-165 |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if the contract implements `interfaceID` and  `interfaceID` is not 0xffffffff, `false` otherwise |

### setERC165

```solidity
function setERC165(bytes4[] interfaceIds, bytes4[] interfaceIdsToRemove) external
```

set or unset ERC165 using DiamondStorage.supportedInterfaces

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceIds | bytes4[] | list of interface id to set as supported |
| interfaceIdsToRemove | bytes4[] | list of interface id to unset as supported. Technically, you can remove support of ERC165 by having the IERC165 id itself being part of that array. |

