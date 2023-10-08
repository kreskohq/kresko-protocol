# Solidity API

## CommonState

```solidity
struct CommonState {
  mapping(address => struct Asset) assets;
  mapping(bytes32 => mapping(enum OracleType => struct Oracle)) oracles;
  mapping(address => mapping(enum Action => struct SafetyState)) safetyState;
  address feeRecipient;
  uint96 minDebtValue;
  address sequencerUptimeFeed;
  uint32 sequencerGracePeriodTime;
  uint32 oracleTimeout;
  uint16 oracleDeviationPct;
  uint8 oracleDecimals;
  bool safetyStateSet;
  uint256 entered;
  mapping(bytes32 => struct RoleData) _roles;
  mapping(bytes32 => struct EnumerableSet.AddressSet) _roleMembers;
}
```

## GatingState

```solidity
struct GatingState {
  address kreskian;
  address questForKresk;
  uint8 phase;
}
```

## COMMON_STORAGE_POSITION

```solidity
bytes32 COMMON_STORAGE_POSITION
```

## cs

```solidity
function cs() internal pure returns (struct CommonState state)
```

## GATING_STORAGE_POSITION

```solidity
bytes32 GATING_STORAGE_POSITION
```

## gs

```solidity
function gs() internal pure returns (struct GatingState state)
```

