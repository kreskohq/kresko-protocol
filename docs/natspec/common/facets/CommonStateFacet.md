# Solidity API

## CommonStateFacet

### domainSeparator

```solidity
function domainSeparator() external view returns (bytes32)
```

The EIP-712 typehash for the contract's domain.

### getStorageVersion

```solidity
function getStorageVersion() external view returns (uint96)
```

amount of times the storage has been upgraded

### getFeeRecipient

```solidity
function getFeeRecipient() external view returns (address)
```

The recipient of protocol fees.

### getExtOracleDecimals

```solidity
function getExtOracleDecimals() external view returns (uint8)
```

Offchain oracle decimals

### getMinDebtValue

```solidity
function getMinDebtValue() external view returns (uint96)
```

The minimum USD value of an individual synthetic asset debt position.

### getOracleDeviationPct

```solidity
function getOracleDeviationPct() external view returns (uint16)
```

max deviation between main oracle and fallback oracle

### getSequencerUptimeFeed

```solidity
function getSequencerUptimeFeed() external view returns (address)
```

Get the L2 sequencer uptime feed address.

### getSequencerUptimeFeedGracePeriod

```solidity
function getSequencerUptimeFeedGracePeriod() external view returns (uint32)
```

Get the L2 sequencer uptime feed grace period

### getOracleTimeout

```solidity
function getOracleTimeout() external view returns (uint32)
```

Get stale timeout treshold for oracle answers.

