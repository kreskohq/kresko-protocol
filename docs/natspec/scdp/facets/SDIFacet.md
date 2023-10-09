# Solidity API

## SDIFacet

### initialize

```solidity
function initialize(address _coverRecipient) external
```

### totalSDI

```solidity
function totalSDI() external view returns (uint256)
```

Simply returns the total supply of SDI.

### getTotalSDIDebt

```solidity
function getTotalSDIDebt() external view returns (uint256)
```

### getEffectiveSDIDebt

```solidity
function getEffectiveSDIDebt() external view returns (uint256)
```

### getEffectiveSDIDebtUSD

```solidity
function getEffectiveSDIDebtUSD() external view returns (uint256)
```

### getSDICoverAmount

```solidity
function getSDICoverAmount() external view returns (uint256)
```

### previewSCDPBurn

```solidity
function previewSCDPBurn(address _assetAddr, uint256 _burnAmount, bool _ignoreFactors) external view returns (uint256 shares)
```

### previewSCDPMint

```solidity
function previewSCDPMint(address _assetAddr, uint256 _mintAmount, bool _ignoreFactors) external view returns (uint256 shares)
```

### getSDIPrice

```solidity
function getSDIPrice() external view returns (uint256)
```

Get the price of SDI in USD, oracle precision.

### getCoverAssetsSDI

```solidity
function getCoverAssetsSDI() external view returns (address[])
```

### SDICover

```solidity
function SDICover(address _assetAddr, uint256 _amount) external returns (uint256 shares, uint256 value)
```

### enableCoverAssetSDI

```solidity
function enableCoverAssetSDI(address _assetAddr) external
```

### disableCoverAssetSDI

```solidity
function disableCoverAssetSDI(address _assetAddr) external
```

### setCoverRecipientSDI

```solidity
function setCoverRecipientSDI(address _newCoverRecipient) external
```

