# Solidity API

## IKreskoAssetIssuer

Contract that can issue/destroy Kresko Assets through Kresko

_This interface is used by KISS & KreskoAssetAnchor_

### issue

```solidity
function issue(uint256 _assets, address _to) external returns (uint256 shares)
```

Mints @param _assets of krAssets for @param _to,
Mints relative @return _shares of wkrAssets

### destroy

```solidity
function destroy(uint256 _assets, address _from) external returns (uint256 shares)
```

Burns @param _assets of krAssets from @param _from,
Burns relative @return _shares of wkrAssets

### convertToShares

```solidity
function convertToShares(uint256 assets) external view returns (uint256 shares)
```

Returns the total amount of anchor tokens out

### convertToAssets

```solidity
function convertToAssets(uint256 shares) external view returns (uint256 assets)
```

Returns the total amount of krAssets out

