# Solidity API

## handleMinterFee

```solidity
function handleMinterFee(address _account, struct Asset _krAsset, uint256 _mintAmount, enum MinterFee _feeType) internal
```

Charges the protocol open fee based off the value of the minted asset.

_Takes the fee from the account's collateral assets. Attempts collateral assets
  in reverse order of the account's deposited collateral assets array._

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account to charge the open fee from. |
| _krAsset | struct Asset | Asset struct of the kresko asset being minted. |
| _mintAmount | uint256 | Amount of the kresko asset being minted. |
| _feeType | enum MinterFee | Fee type |

## _calcAndHandleCollateralsArray

```solidity
function _calcAndHandleCollateralsArray(address _collateralAsset, struct Asset _asset, address _account, uint256 _feeValue, uint256 _collateralAssetIndex) internal returns (uint256 transferAmount, uint256 feeValuePaid)
```

Calculates the fee to be taken from a user's deposited collateral asset.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collateralAsset | address | The collateral asset from which to take to the fee. |
| _asset | struct Asset |  |
| _account | address | The owner of the collateral. |
| _feeValue | uint256 | The original value of the fee. |
| _collateralAssetIndex | uint256 | The collateral asset's index in the user's depositedCollateralAssets array. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| transferAmount | uint256 | to be received as a uint256 |
| feeValuePaid | uint256 | wad representing the fee value paid. |

