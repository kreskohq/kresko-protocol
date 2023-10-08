# Solidity API

## IKreskoAssetAnchor

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```

Track the underlying amount

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total supply for the underlying |

### initialize

```solidity
function initialize(contract IKreskoAsset _asset, string _name, string _symbol, address _admin) external
```

Initializes the Kresko Asset Anchor.

_Decimals are not supplied as they are read from the underlying Kresko Asset_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _asset | contract IKreskoAsset | The underlying (Kresko) Asset |
| _name | string | Name of the anchor token |
| _symbol | string | Symbol of the anchor token |
| _admin | address | The adminstrator of this contract. |

### reinitializeERC20

```solidity
function reinitializeERC20(string _name, string _symbol, uint8 _version) external
```

Updates ERC20 metadata for the token in case eg. a ticker change

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | new name for the asset |
| _symbol | string | new symbol for the asset |
| _version | uint8 | number that must be greater than latest emitted `Initialized` version |

### wrap

```solidity
function wrap(uint256 assets) external
```

Mint Kresko Anchor Asset to Kresko Asset (Only KreskoAsset can call)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The assets (uint256). |

### unwrap

```solidity
function unwrap(uint256 assets) external
```

Burn Kresko Anchor Asset to Kresko Asset (Only KreskoAsset can call)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The assets (uint256). |

