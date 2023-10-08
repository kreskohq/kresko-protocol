# Solidity API

## DepositWithdrawFacet

Main end-user functionality concerning collateral asset deposits and withdrawals within the Kresko protocol

### depositCollateral

```solidity
function depositCollateral(address _account, address _collateralAsset, uint256 _depositAmount) external
```

Deposits collateral into the protocol.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The user to deposit collateral for. |
| _collateralAsset | address | The address of the collateral asset. |
| _depositAmount | uint256 | The amount of the collateral asset to deposit. |

### withdrawCollateral

```solidity
function withdrawCollateral(address _account, address _collateralAsset, uint256 _withdrawAmount, uint256 _collateralIndex) external
```

Withdraws sender's collateral from the protocol.

_Requires that the post-withdrawal collateral value does not violate minimum collateral requirement._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The address to withdraw assets for. |
| _collateralAsset | address | The address of the collateral asset. |
| _withdrawAmount | uint256 | The amount of the collateral asset to withdraw. |
| _collateralIndex | uint256 | The index of the collateral asset in the sender's deposited collateral assets array. Only needed if withdrawing the entire deposit of a particular collateral asset. |

### withdrawCollateralUnchecked

```solidity
function withdrawCollateralUnchecked(address _account, address _collateralAsset, uint256 _withdrawAmount, uint256 _collateralIndex, bytes _userData) external
```

Withdraws sender's collateral from the protocol before checking minimum collateral ratio.

_Executes post-withdraw-callback triggering onUncheckedCollateralWithdraw on the caller
Requires that the post-withdraw-callback collateral value does not violate minimum collateral requirement._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | The address to withdraw assets for. |
| _collateralAsset | address | The address of the collateral asset. |
| _withdrawAmount | uint256 | The amount of the collateral asset to withdraw. |
| _collateralIndex | uint256 | The index of the collateral asset in the sender's deposited collateral assets array. Only needed if withdrawing the entire deposit of a particular collateral asset. |
| _userData | bytes |  |

