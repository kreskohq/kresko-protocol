# Solidity API

## SCDPSwapFacet

### cumulateIncomeSCDP

```solidity
function cumulateIncomeSCDP(address _depositAssetAddr, uint256 _incomeAmount) external returns (uint256)
```

Accumulates fees to deposits as a fixed, instantaneous income.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _depositAssetAddr | address | Deposit asset to give income for |
| _incomeAmount | uint256 | Amount to accumulate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

### previewSwapSCDP

```solidity
function previewSwapSCDP(address _assetIn, address _assetOut, uint256 _amountIn) external view returns (uint256 amountOut, uint256 feeAmount, uint256 feeAmountProtocol)
```

Preview the amount out received.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _assetIn | address | The asset to pay with. |
| _assetOut | address | The asset to receive. |
| _amountIn | uint256 | The amount of _assetIn to pay. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The amount of `_assetOut` to receive according to `_amountIn`. |
| feeAmount | uint256 |  |
| feeAmountProtocol | uint256 |  |

### swapSCDP

```solidity
function swapSCDP(address _receiver, address _assetIn, address _assetOut, uint256 _amountIn, uint256 _amountOutMin) external
```

Swap kresko assets with KISS using the shared collateral pool.
Uses oracle pricing of _amountIn to determine how much _assetOut to send.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address |  |
| _assetIn | address | The asset to pay with. |
| _assetOut | address | The asset to receive. |
| _amountIn | uint256 | The amount of _assetIn to pay. |
| _amountOutMin | uint256 | The minimum amount of _assetOut to receive, this is due to possible oracle price change. |

## getSwapFees

```solidity
function getSwapFees(struct Asset _assetIn, struct Asset _assetOut) internal view returns (uint256 feePercentage, uint256 protocolFee)
```

Get fee percentage for a swap pair.

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feePercentage | uint256 | fee percentage for this swap |
| protocolFee | uint256 | protocol fee percentage taken from the fee |

