# Solidity API

## Swap

### handleAssetsIn

```solidity
function handleAssetsIn(struct SCDPState self, address _assetInAddr, struct Asset _assetIn, uint256 _amountIn, address _assetsFrom) internal returns (uint256)
```

Records the assets received from account in a swap.
Burning any existing shared debt or increasing collateral deposits.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _assetInAddr | address | The asset received. |
| _assetIn | struct Asset | The asset in struct. |
| _amountIn | uint256 | The amount of the asset received. |
| _assetsFrom | address | The account that holds the assets to burn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The value of the assets received into the protocol, used to calculate assets out. |

### handleAssetsOut

```solidity
function handleAssetsOut(struct SCDPState self, address _assetOutAddr, struct Asset _assetOut, uint256 _valueIn, address _assetsTo) internal returns (uint256 amountOut)
```

Records the assets to send out in a swap.
Increasing debt of the pool by minting new assets when required.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _assetOutAddr | address | The asset to send out. |
| _assetOut | struct Asset | The asset out struct. |
| _valueIn | uint256 | The value received in. |
| _assetsTo | address | The asset receiver. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The amount of the asset out. |

### cumulateIncome

```solidity
function cumulateIncome(struct SCDPState self, address _assetAddr, struct Asset _asset, uint256 _amount) internal returns (uint256 nextLiquidityIndex)
```

Accumulates fees to deposits as a fixed, instantaneous income.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| self | struct SCDPState |  |
| _assetAddr | address | The asset address |
| _asset | struct Asset | The asset struct |
| _amount | uint256 | The amount to accumulate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| nextLiquidityIndex | uint256 | The next liquidity index of the reserve |

