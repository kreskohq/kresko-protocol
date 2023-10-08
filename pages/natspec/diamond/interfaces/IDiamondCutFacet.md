# Solidity API

## IDiamondCutFacet

### diamondCut

```solidity
function diamondCut(struct FacetCut[] _diamondCut, address _init, bytes _calldata) external
```

Add/replace/remove any number of functions, optionally execute a function with delegatecall

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _diamondCut | struct FacetCut[] | Contains the facet addresses and function selectors |
| _init | address | The address of the contract or facet to execute _calldata |
| _calldata | bytes | A function call, including function selector and arguments                  _calldata is executed with delegatecall on _init |

### upgradeState

```solidity
function upgradeState(address _init, bytes _calldata) external
```

Use an initializer contract without doing modifications

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _init | address | The address of the contract or facet to execute _calldata |
| _calldata | bytes | A function call, including function selector and arguments - _calldata is executed with delegatecall on _init |

