# Solidity API

## ISDIFacet

### initialize

```solidity
function initialize(address coverRecipient) external
```

### getTotalSDIDebt

```solidity
function getTotalSDIDebt() external view returns (uint256)
```

### getEffectiveSDIDebtUSD

```solidity
function getEffectiveSDIDebtUSD() external view returns (uint256)
```

### getEffectiveSDIDebt

```solidity
function getEffectiveSDIDebt() external view returns (uint256)
```

### getSDICoverAmount

```solidity
function getSDICoverAmount() external view returns (uint256)
```

### previewSCDPBurn

```solidity
function previewSCDPBurn(address _asset, uint256 _burnAmount, bool _ignoreFactors) external view returns (uint256 shares)
```

### previewSCDPMint

```solidity
function previewSCDPMint(address _asset, uint256 _mintAmount, bool _ignoreFactors) external view returns (uint256 shares)
```

### totalSDI

```solidity
function totalSDI() external view returns (uint256)
```

Simply returns the total supply of SDI.

### getSDIPrice

```solidity
function getSDIPrice() external view returns (uint256)
```

Get the price of SDI in USD, oracle precision.

### SDICover

```solidity
function SDICover(address _asset, uint256 _amount) external returns (uint256 shares, uint256 value)
```

### enableCoverAssetSDI

```solidity
function enableCoverAssetSDI(address _asset) external
```

### disableCoverAssetSDI

```solidity
function disableCoverAssetSDI(address _asset) external
```

### setCoverRecipientSDI

```solidity
function setCoverRecipientSDI(address _coverRecipient) external
```

### getCoverAssetsSDI

```solidity
function getCoverAssetsSDI() external view returns (address[])
```

