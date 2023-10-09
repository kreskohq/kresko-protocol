# Solidity API

## IDiamondLoupeFacet

### facets

```solidity
function facets() external view returns (struct Facet[] facets_)
```

Gets all facet addresses and their four byte function selectors.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| facets_ | struct Facet[] | Facet |

### facetFunctionSelectors

```solidity
function facetFunctionSelectors(address _facet) external view returns (bytes4[] facetFunctionSelectors_)
```

Gets all the function selectors supported by a specific facet.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _facet | address | The facet address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| facetFunctionSelectors_ | bytes4[] |  |

### facetAddresses

```solidity
function facetAddresses() external view returns (address[] facetAddresses_)
```

Get all the facet addresses used by a diamond.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| facetAddresses_ | address[] |  |

### facetAddress

```solidity
function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_)
```

Gets the facet that supports the given selector.

_If facet is not found return address(0)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _functionSelector | bytes4 | The function selector. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| facetAddress_ | address | The facet address. |

