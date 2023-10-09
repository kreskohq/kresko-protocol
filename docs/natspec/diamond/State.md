# Solidity API

## DiamondState

```solidity
struct DiamondState {
  mapping(bytes4 => struct FacetAddressAndPosition) selectorToFacetAndPosition;
  mapping(address => struct FacetFunctionSelectors) facetFunctionSelectors;
  address[] facetAddresses;
  mapping(bytes4 => bool) supportedInterfaces;
  address self;
  bool initialized;
  bytes32 diamondDomainSeparator;
  address contractOwner;
  address pendingOwner;
  uint96 storageVersion;
}
```

## DIAMOND_STORAGE_POSITION

```solidity
bytes32 DIAMOND_STORAGE_POSITION
```

## ds

```solidity
function ds() internal pure returns (struct DiamondState state)
```

Ds, a pure free function.

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| state | struct DiamondState | A DiamondState value. |

