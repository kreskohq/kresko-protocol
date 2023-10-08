# Solidity API

## Role

### DEFAULT_ADMIN

```solidity
bytes32 DEFAULT_ADMIN
```

_Meta role for all roles._

### ADMIN

```solidity
bytes32 ADMIN
```

_keccak256("kresko.roles.minter.admin")_

### OPERATOR

```solidity
bytes32 OPERATOR
```

_keccak256("kresko.roles.minter.operator")_

### MANAGER

```solidity
bytes32 MANAGER
```

_keccak256("kresko.roles.minter.manager")_

### SAFETY_COUNCIL

```solidity
bytes32 SAFETY_COUNCIL
```

_keccak256("kresko.roles.minter.safety.council")_

## NOT_ENTERED

```solidity
uint8 NOT_ENTERED
```

## ENTERED

```solidity
uint8 ENTERED
```

## Oracle

Oracle configuration mapped to `Asset.underlyingId`.

```solidity
struct Oracle {
  address feed;
  function (address) view external returns (uint256) priceGetter;
}
```

## OracleType

Supported oracle providers.

```solidity
enum OracleType {
  Redstone,
  Chainlink,
  API3
}
```

## FeedConfiguration

Feed configuration.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct FeedConfiguration {
  enum OracleType[2] oracleIds;
  address[2] feeds;
}
```

## Asset

All assets in the protocol share this configuration.
underlyingId is not unique, eg. krETH and WETH both would use bytes12('ETH')

_Percentages use 2 decimals: 1e4 (10000) == 100.00%. See {PercentageMath.sol}.
Note that the percentage value for uint16 caps at 655.36%._

```solidity
struct Asset {
  bytes12 underlyingId;
  address anchor;
  enum OracleType[2] oracles;
  uint16 factor;
  uint16 kFactor;
  uint16 openFee;
  uint16 closeFee;
  uint16 liqIncentive;
  uint128 supplyLimit;
  uint128 depositLimitSCDP;
  uint128 liquidityIndexSCDP;
  uint16 swapInFeeSCDP;
  uint16 swapOutFeeSCDP;
  uint16 protocolFeeShareSCDP;
  uint16 liqIncentiveSCDP;
  uint8 decimals;
  bool isCollateral;
  bool isKrAsset;
  bool isSCDPDepositAsset;
  bool isSCDPKrAsset;
  bool isSCDPCollateral;
  bool isSCDPCoverAsset;
}
```

## RoleData

The access control role data.

```solidity
struct RoleData {
  mapping(address => bool) members;
  bytes32 adminRole;
}
```

## MaxLiqVars

Variables used for calculating the max liquidation value.

```solidity
struct MaxLiqVars {
  struct Asset collateral;
  uint256 accountCollateralValue;
  uint256 minCollateralValue;
  uint256 seizeCollateralAccountValue;
  uint192 minDebtValue;
  uint32 gainFactor;
  uint32 maxLiquidationRatio;
  uint32 debtFactor;
}
```

## MaxLiqInfo

```solidity
struct MaxLiqInfo {
  address account;
  address seizeAssetAddr;
  address repayAssetAddr;
  uint256 repayValue;
  uint256 repayAmount;
  uint256 seizeAmount;
  uint256 seizeValue;
  uint256 repayAssetPrice;
  uint256 repayAssetIndex;
  uint256 seizeAssetPrice;
  uint256 seizeAssetIndex;
}
```

## PushPrice

Convenience struct for returning push price data

```solidity
struct PushPrice {
  uint256 price;
  uint256 timestamp;
}
```

## Pause

Configuration for pausing `Action`

```solidity
struct Pause {
  bool enabled;
  uint256 timestamp0;
  uint256 timestamp1;
}
```

## SafetyState

Safety configuration for assets

```solidity
struct SafetyState {
  struct Pause pause;
}
```

## CommonInitArgs

Initialization arguments for common values

```solidity
struct CommonInitArgs {
  address admin;
  address council;
  address treasury;
  uint64 minDebtValue;
  uint16 oracleDeviationPct;
  uint8 oracleDecimals;
  address sequencerUptimeFeed;
  uint32 sequencerGracePeriodTime;
  uint32 oracleTimeout;
  address kreskian;
  address questForKresk;
  uint8 phase;
}
```

## SCDPCollateralArgs

```solidity
struct SCDPCollateralArgs {
  uint128 liquidityIndex;
  uint128 depositLimit;
  uint8 decimals;
}
```

## SCDPKrAssetArgs

```solidity
struct SCDPKrAssetArgs {
  uint128 supplyLimit;
  uint16 liqIncentive;
  uint16 protocolFee;
  uint16 openFee;
  uint16 closeFee;
}
```

## Action

_Protocol user facing actions

Deposit = 0
Withdraw = 1,
Repay = 2,
Borrow = 3,
Liquidate = 4_

```solidity
enum Action {
  Deposit,
  Withdraw,
  Repay,
  Borrow,
  Liquidation,
  SCDPDeposit,
  SCDPSwap,
  SCDPWithdraw,
  SCDPRepay,
  SCDPLiquidation
}
```

