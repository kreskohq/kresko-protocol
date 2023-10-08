# Solidity API

## IBurnFacet

### burnKreskoAsset

```solidity
function burnKreskoAsset(address _account, address _kreskoAsset, uint256 _burnAmount, uint256 _mintedKreskoAssetIndex) external
```

Burns existing Kresko assets.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The address to burn kresko assets for |
| _kreskoAsset | address | The address of the Kresko asset. |
| _burnAmount | uint256 | The amount of the Kresko asset to be burned. |
| _mintedKreskoAssetIndex | uint256 | The index of the kresko asset in the user's minted assets array. Only needed if burning all principal debt of a particular collateral asset. |

