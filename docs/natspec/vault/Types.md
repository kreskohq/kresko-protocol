# Solidity API

## VaultAsset

Asset struct for deposit assets in contract

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct VaultAsset {
  contract ERC20 token;
  contract AggregatorV3Interface oracle;
  uint256 maxDeposits;
  uint256 depositFee;
  uint256 withdrawFee;
  bool enabled;
}
```

