# Solidity API

## Facet

These functions are expected to be called frequently
by tools.

```solidity
struct Facet {
  address facetAddress;
  bytes4[] functionSelectors;
}
```

## FacetAddressAndPosition

```solidity
struct FacetAddressAndPosition {
  address facetAddress;
  uint96 functionSelectorPosition;
}
```

## FacetFunctionSelectors

```solidity
struct FacetFunctionSelectors {
  bytes4[] functionSelectors;
  uint256 facetAddressPosition;
}
```

## FacetCutAction

_Add=0, Replace=1, Remove=2_

```solidity
enum FacetCutAction {
  Add,
  Replace,
  Remove
}
```

## FacetCut

```solidity
struct FacetCut {
  address facetAddress;
  enum FacetCutAction action;
  bytes4[] functionSelectors;
}
```

## Initialization

```solidity
struct Initialization {
  address initContract;
  bytes initData;
}
```

