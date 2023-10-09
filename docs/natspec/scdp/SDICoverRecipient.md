# Solidity API

## SDICoverRecipient

### owner

```solidity
address owner
```

### pendingOwner

```solidity
address pendingOwner
```

### constructor

```solidity
constructor(address _owner) public
```

### withdraw

```solidity
function withdraw(address token, address recipient, uint256 amount) external
```

### changeOwner

```solidity
function changeOwner(address _owner) external
```

### acceptOwnership

```solidity
function acceptOwnership(address _owner) external
```

