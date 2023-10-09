# Solidity API

## CommonConfigurationFacet

### initializeCommon

```solidity
function initializeCommon(struct CommonInitArgs args) external
```

### updateMinDebtValue

```solidity
function updateMinDebtValue(uint96 _newMinDebtValue) public
```

_Updates the contract's minimum debt value._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newMinDebtValue | uint96 | The new minimum debt value as a wad. |

### updateFeeRecipient

```solidity
function updateFeeRecipient(address _newFeeRecipient) public
```

Updates the fee recipient.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newFeeRecipient | address | The new fee recipient. |

### updateExtOracleDecimals

```solidity
function updateExtOracleDecimals(uint8 _decimals) public
```

Sets the decimal precision of external oracle

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _decimals | uint8 | Amount of decimals |

### updateOracleDeviationPct

```solidity
function updateOracleDeviationPct(uint16 _oracleDeviationPct) public
```

Sets the decimal precision of external oracle

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oracleDeviationPct | uint16 | Amount of decimals |

### updateSequencerUptimeFeed

```solidity
function updateSequencerUptimeFeed(address _sequencerUptimeFeed) public
```

Sets L2 sequencer uptime feed address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sequencerUptimeFeed | address | sequencer uptime feed address |

### updateSequencerGracePeriodTime

```solidity
function updateSequencerGracePeriodTime(uint32 _sequencerGracePeriodTime) public
```

Sets sequencer grace period time

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sequencerGracePeriodTime | uint32 | grace period time |

### updateOracleTimeout

```solidity
function updateOracleTimeout(uint32 _oracleTimeout) public
```

Sets oracle timeout

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oracleTimeout | uint32 | oracle timeout in seconds |

### updatePhase

```solidity
function updatePhase(uint8 _phase) public
```

Sets phase of gating mechanism

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _phase | uint8 | phase id |

### updateKreskian

```solidity
function updateKreskian(address _kreskian) public
```

Sets address of Kreskian NFT contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _kreskian | address | kreskian nft contract address |

### updateQuestForKresk

```solidity
function updateQuestForKresk(address _questForKresk) public
```

Sets address of Quest For Kresk NFT contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _questForKresk | address | Quest For Kresk NFT contract address |

