# Solidity API

## collateralAmountToValues

```solidity
function collateralAmountToValues(struct Asset self, uint256 _amount) internal view returns (uint256 value, uint256 valueAdjusted, uint256 price)
```

Helper function to get unadjusted, adjusted and price values for collateral assets

## debtAmountToValues

```solidity
function debtAmountToValues(struct Asset self, uint256 _amount) internal view returns (uint256 value, uint256 valueAdjusted, uint256 price)
```

Helper function to get unadjusted, adjusted and price values for debt assets

