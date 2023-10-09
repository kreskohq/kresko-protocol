# Solidity API

## initializeDiamondCut

```solidity
function initializeDiamondCut(address _init, bytes _calldata) internal
```

## DCuts

### cut

```solidity
function cut(struct DiamondState self, struct FacetCut[] _diamondCut, address _init, bytes _calldata) internal
```

### addFunctions

```solidity
function addFunctions(struct DiamondState self, address _facetAddress, bytes4[] _functionSelectors) internal
```

### replaceFunctions

```solidity
function replaceFunctions(struct DiamondState self, address _facetAddress, bytes4[] _functionSelectors) internal
```

### removeFunctions

```solidity
function removeFunctions(struct DiamondState self, address _facetAddress, bytes4[] _functionSelectors) internal
```

### addFacet

```solidity
function addFacet(struct DiamondState self, address _facetAddress) internal
```

### addFunction

```solidity
function addFunction(struct DiamondState self, bytes4 _selector, uint96 _selectorPosition, address _facetAddress) internal
```

### removeFunction

```solidity
function removeFunction(struct DiamondState self, address _facetAddress, bytes4 _selector) internal
```

