# Solidity API

## CError

### DIAMOND_CALLDATA_IS_NOT_EMPTY

```solidity
error DIAMOND_CALLDATA_IS_NOT_EMPTY()
```

### ADDRESS_HAS_NO_CODE

```solidity
error ADDRESS_HAS_NO_CODE(address)
```

### DIAMOND_INIT_ADDRESS_ZERO_BUT_CALLDATA_NOT_EMPTY

```solidity
error DIAMOND_INIT_ADDRESS_ZERO_BUT_CALLDATA_NOT_EMPTY()
```

### DIAMOND_INIT_NOT_ZERO_BUT_CALLDATA_IS_EMPTY

```solidity
error DIAMOND_INIT_NOT_ZERO_BUT_CALLDATA_IS_EMPTY()
```

### DIAMOND_INIT_HAS_NO_CODE

```solidity
error DIAMOND_INIT_HAS_NO_CODE()
```

### DIAMOND_FUNCTION_ALREADY_EXISTS

```solidity
error DIAMOND_FUNCTION_ALREADY_EXISTS(address, address, bytes4)
```

### DIAMOND_INIT_FAILED

```solidity
error DIAMOND_INIT_FAILED(address)
```

### DIAMOND_INCORRECT_FACET_CUT_ACTION

```solidity
error DIAMOND_INCORRECT_FACET_CUT_ACTION()
```

### DIAMOND_REMOVE_FUNCTIONS_NONZERO_FACET_ADDRESS

```solidity
error DIAMOND_REMOVE_FUNCTIONS_NONZERO_FACET_ADDRESS(address)
```

### DIAMOND_NO_FACET_SELECTORS

```solidity
error DIAMOND_NO_FACET_SELECTORS(address)
```

### ETH_TRANSFER_FAILED

```solidity
error ETH_TRANSFER_FAILED(address, uint256)
```

### TRANSFER_FAILED

```solidity
error TRANSFER_FAILED(address, address, address, uint256)
```

### INVALID_SIGNER

```solidity
error INVALID_SIGNER(address, address)
```

### APPROVE_FAILED

```solidity
error APPROVE_FAILED(address, address, address, uint256)
```

### PERMIT_DEADLINE_EXPIRED

```solidity
error PERMIT_DEADLINE_EXPIRED(address, address, uint256, uint256)
```

### SAFE_ERC20_PERMIT_ERC20_OPERATION_FAILED

```solidity
error SAFE_ERC20_PERMIT_ERC20_OPERATION_FAILED(address)
```

### SAFE_ERC20_PERMIT_APPROVE_NON_ZERO

```solidity
error SAFE_ERC20_PERMIT_APPROVE_NON_ZERO(address, uint256, uint256)
```

### DIAMOND_REMOVE_FUNCTION_FACET_IS_ZERO

```solidity
error DIAMOND_REMOVE_FUNCTION_FACET_IS_ZERO()
```

### DIAMOND_REPLACE_FUNCTION_DUPLICATE

```solidity
error DIAMOND_REPLACE_FUNCTION_DUPLICATE()
```

### STRING_HEX_LENGTH_INSUFFICIENT

```solidity
error STRING_HEX_LENGTH_INSUFFICIENT()
```

### ALREADY_INITIALIZED

```solidity
error ALREADY_INITIALIZED()
```

### SAFE_ERC20_PERMIT_DECREASE_BELOW_ZERO

```solidity
error SAFE_ERC20_PERMIT_DECREASE_BELOW_ZERO(address, uint256, uint256)
```

### INVALID_SENDER

```solidity
error INVALID_SENDER(address, address)
```

### NOT_OWNER

```solidity
error NOT_OWNER(address who, address owner)
```

### NOT_PENDING_OWNER

```solidity
error NOT_PENDING_OWNER(address who, address pendingOwner)
```

### SEIZE_UNDERFLOW

```solidity
error SEIZE_UNDERFLOW(uint256, uint256)
```

### MARKET_CLOSED

```solidity
error MARKET_CLOSED(address, string)
```

### SCDP_ASSET_ECONOMY

```solidity
error SCDP_ASSET_ECONOMY(address seizeAsset, uint256 seizeReductionPct, address repayAsset, uint256 repayIncreasePct)
```

### MINTER_ASSET_ECONOMY

```solidity
error MINTER_ASSET_ECONOMY(address seizeAsset, uint256 seizeReductionPct, address repayAsset, uint256 repayIncreasePct)
```

### INVALID_ASSET

```solidity
error INVALID_ASSET(address asset)
```

### DEBT_EXCEEDS_COLLATERAL

```solidity
error DEBT_EXCEEDS_COLLATERAL(uint256 collateralValue, uint256 minCollateralValue, uint32 ratio)
```

### DEPOSIT_LIMIT

```solidity
error DEPOSIT_LIMIT(address asset, uint256 deposits, uint256 limit)
```

### INVALID_MIN_DEBT

```solidity
error INVALID_MIN_DEBT(uint256 invalid, uint256 valid)
```

### INVALID_SCDP_FEE

```solidity
error INVALID_SCDP_FEE(address asset, uint256 invalid, uint256 valid)
```

### INVALID_MCR

```solidity
error INVALID_MCR(uint256 invalid, uint256 valid)
```

### COLLATERAL_DOES_NOT_EXIST

```solidity
error COLLATERAL_DOES_NOT_EXIST(address asset)
```

### KRASSET_DOES_NOT_EXIST

```solidity
error KRASSET_DOES_NOT_EXIST(address asset)
```

### SAFETY_COUNCIL_NOT_ALLOWED

```solidity
error SAFETY_COUNCIL_NOT_ALLOWED()
```

### NATIVE_TOKEN_DISABLED

```solidity
error NATIVE_TOKEN_DISABLED()
```

### SAFETY_COUNCIL_INVALID_ADDRESS

```solidity
error SAFETY_COUNCIL_INVALID_ADDRESS(address)
```

### SAFETY_COUNCIL_ALREADY_EXISTS

```solidity
error SAFETY_COUNCIL_ALREADY_EXISTS()
```

### MULTISIG_NOT_ENOUGH_OWNERS

```solidity
error MULTISIG_NOT_ENOUGH_OWNERS(uint256 owners, uint256 required)
```

### ACCESS_CONTROL_NOT_SELF

```solidity
error ACCESS_CONTROL_NOT_SELF(address who, address self)
```

### INVALID_MLR

```solidity
error INVALID_MLR(uint256 invalid, uint256 valid)
```

### INVALID_LT

```solidity
error INVALID_LT(uint256 invalid, uint256 valid)
```

### INVALID_PROTOCOL_FEE

```solidity
error INVALID_PROTOCOL_FEE(address asset, uint256 invalid, uint256 valid)
```

### INVALID_ORACLE_DEVIATION

```solidity
error INVALID_ORACLE_DEVIATION(uint256 invalid, uint256 valid)
```

### INVALID_FEE_RECIPIENT

```solidity
error INVALID_FEE_RECIPIENT(address invalid)
```

### INVALID_LIQ_INCENTIVE

```solidity
error INVALID_LIQ_INCENTIVE(address asset, uint256 invalid, uint256 valid)
```

### LIQ_AMOUNT_OVERFLOW

```solidity
error LIQ_AMOUNT_OVERFLOW(uint256 invalid, uint256 valid)
```

### MAX_LIQ_OVERFLOW

```solidity
error MAX_LIQ_OVERFLOW(uint256 value)
```

### SCDP_WITHDRAWAL_VIOLATION

```solidity
error SCDP_WITHDRAWAL_VIOLATION(address asset, uint256 requested, uint256 principal, uint256 scaled)
```

### INVALID_DEPOSIT_ASSET

```solidity
error INVALID_DEPOSIT_ASSET(address asset)
```

### IDENTICAL_ASSETS

```solidity
error IDENTICAL_ASSETS()
```

### NO_PUSH_PRICE

```solidity
error NO_PUSH_PRICE(string underlyingId)
```

### NO_PUSH_ORACLE_SET

```solidity
error NO_PUSH_ORACLE_SET(string underlyingId)
```

### INVALID_FEE_TYPE

```solidity
error INVALID_FEE_TYPE(uint8 invalid, uint8 valid)
```

### ZERO_ADDRESS

```solidity
error ZERO_ADDRESS()
```

### WRAP_NOT_SUPPORTED

```solidity
error WRAP_NOT_SUPPORTED()
```

### BURN_AMOUNT_OVERFLOW

```solidity
error BURN_AMOUNT_OVERFLOW(uint256 burnAmount, uint256 debtAmount)
```

### PAUSED

```solidity
error PAUSED(address who)
```

### ZERO_PRICE

```solidity
error ZERO_PRICE(string underlyingId)
```

### SEQUENCER_DOWN_NO_REDSTONE_AVAILABLE

```solidity
error SEQUENCER_DOWN_NO_REDSTONE_AVAILABLE()
```

### NEGATIVE_PRICE

```solidity
error NEGATIVE_PRICE(address asset, int256 price)
```

### PRICE_UNSTABLE

```solidity
error PRICE_UNSTABLE(uint256 primaryPrice, uint256 referencePrice)
```

### ORACLE_ZERO_ADDRESS

```solidity
error ORACLE_ZERO_ADDRESS(string underlyingId)
```

### ASSET_DOES_NOT_EXIST

```solidity
error ASSET_DOES_NOT_EXIST(address asset)
```

### ASSET_ALREADY_EXISTS

```solidity
error ASSET_ALREADY_EXISTS(address asset)
```

### INVALID_ASSET_ID

```solidity
error INVALID_ASSET_ID(address asset)
```

### NO_MINTED_ASSETS

```solidity
error NO_MINTED_ASSETS(address who)
```

### NO_COLLATERALS_DEPOSITED

```solidity
error NO_COLLATERALS_DEPOSITED(address who)
```

### MISSING_PHASE_3_NFT

```solidity
error MISSING_PHASE_3_NFT()
```

### MISSING_PHASE_2_NFT

```solidity
error MISSING_PHASE_2_NFT()
```

### MISSING_PHASE_1_NFT

```solidity
error MISSING_PHASE_1_NFT()
```

### DIAMOND_FUNCTION_NOT_FOUND

```solidity
error DIAMOND_FUNCTION_NOT_FOUND(bytes4)
```

### RE_ENTRANCY

```solidity
error RE_ENTRANCY()
```

### INVALID_API3_PRICE

```solidity
error INVALID_API3_PRICE(string underlyingId)
```

### INVALID_CL_PRICE

```solidity
error INVALID_CL_PRICE(string underlyingId)
```

### ARRAY_LENGTH_MISMATCH

```solidity
error ARRAY_LENGTH_MISMATCH(string asset, uint256 arr1, uint256 arr2)
```

### ACTION_PAUSED_FOR_ASSET

```solidity
error ACTION_PAUSED_FOR_ASSET()
```

### INVALID_KFACTOR

```solidity
error INVALID_KFACTOR(address asset, uint256 invalid, uint256 valid)
```

### INVALID_CFACTOR

```solidity
error INVALID_CFACTOR(address asset, uint256 invalid, uint256 valid)
```

### INVALID_MINTER_FEE

```solidity
error INVALID_MINTER_FEE(address asset, uint256 invalid, uint256 valid)
```

### INVALID_DECIMALS

```solidity
error INVALID_DECIMALS(address asset, uint256 decimals)
```

### INVALID_KRASSET_CONTRACT

```solidity
error INVALID_KRASSET_CONTRACT(address asset)
```

### INVALID_KRASSET_ANCHOR

```solidity
error INVALID_KRASSET_ANCHOR(address asset)
```

### SUPPLY_LIMIT

```solidity
error SUPPLY_LIMIT(address asset, uint256 invalid, uint256 valid)
```

### CANNOT_LIQUIDATE

```solidity
error CANNOT_LIQUIDATE(uint256 collateralValue, uint256 minCollateralValue)
```

### CANNOT_COVER

```solidity
error CANNOT_COVER(uint256 collateralValue, uint256 minCollateralValue)
```

### INVALID_KRASSET_OPERATOR

```solidity
error INVALID_KRASSET_OPERATOR(address invalidOperator)
```

### INVALID_ASSET_INDEX

```solidity
error INVALID_ASSET_INDEX(address asset, uint256 index, uint256 maxIndex)
```

### ZERO_DEPOSIT

```solidity
error ZERO_DEPOSIT(address asset)
```

### ZERO_AMOUNT

```solidity
error ZERO_AMOUNT(address asset)
```

### ZERO_WITHDRAW

```solidity
error ZERO_WITHDRAW(address asset)
```

### ZERO_MINT

```solidity
error ZERO_MINT(address asset)
```

### ZERO_REPAY

```solidity
error ZERO_REPAY(address asset)
```

### ZERO_BURN

```solidity
error ZERO_BURN(address asset)
```

### ZERO_DEBT

```solidity
error ZERO_DEBT(address asset)
```

### SELF_LIQUIDATION

```solidity
error SELF_LIQUIDATION()
```

### REPAY_OVERFLOW

```solidity
error REPAY_OVERFLOW(uint256 invalid, uint256 valid)
```

### CUMULATE_AMOUNT_ZERO

```solidity
error CUMULATE_AMOUNT_ZERO()
```

### CUMULATE_NO_DEPOSITS

```solidity
error CUMULATE_NO_DEPOSITS()
```

### REPAY_TOO_MUCH

```solidity
error REPAY_TOO_MUCH(uint256 invalid, uint256 valid)
```

### SWAP_NOT_ENABLED

```solidity
error SWAP_NOT_ENABLED(address assetIn, address assetOut)
```

### SWAP_SLIPPAGE

```solidity
error SWAP_SLIPPAGE(uint256 invalid, uint256 valid)
```

### SWAP_ZERO_AMOUNT

```solidity
error SWAP_ZERO_AMOUNT()
```

### NOT_INCOME_ASSET

```solidity
error NOT_INCOME_ASSET(address incomeAsset)
```

### ASSET_NOT_ENABLED

```solidity
error ASSET_NOT_ENABLED(address asset)
```

### INVALID_ASSET_SDI

```solidity
error INVALID_ASSET_SDI(address asset)
```

### ASSET_ALREADY_ENABLED

```solidity
error ASSET_ALREADY_ENABLED(address asset)
```

### ASSET_ALREADY_DISABLED

```solidity
error ASSET_ALREADY_DISABLED(address asset)
```

### INVALID_PRICE

```solidity
error INVALID_PRICE(address token, address oracle, int256 price)
```

### INVALID_DEPOSIT

```solidity
error INVALID_DEPOSIT(uint256 assetsIn, uint256 sharesOut)
```

### INVALID_WITHDRAW

```solidity
error INVALID_WITHDRAW(uint256 sharesIn, uint256 assetsOut)
```

### ROUNDING_ERROR

```solidity
error ROUNDING_ERROR(string desc, uint256 sharesIn, uint256 assetsOut)
```

### MAX_DEPOSIT_EXCEEDED

```solidity
error MAX_DEPOSIT_EXCEEDED(uint256 assetsIn, uint256 maxDeposit)
```

### MAX_SUPPLY_EXCEEDED

```solidity
error MAX_SUPPLY_EXCEEDED(address asset, uint256 supply, uint256 maxSupply)
```

### COLLATERAL_VALUE_LOW

```solidity
error COLLATERAL_VALUE_LOW(uint256 value, uint256 minRequiredValue)
```

### MINT_VALUE_LOW

```solidity
error MINT_VALUE_LOW(address asset, uint256 value, uint256 minRequiredValue)
```

### INVALID_FEE

```solidity
error INVALID_FEE(uint256 invalid, uint256 valid)
```

### NOT_A_CONTRACT

```solidity
error NOT_A_CONTRACT(address who)
```

### NO_ALLOWANCE

```solidity
error NO_ALLOWANCE(address spender, address owner, uint256 requested, uint256 allowed)
```

### NOT_ENOUGH_BALANCE

```solidity
error NOT_ENOUGH_BALANCE(address who, uint256 requested, uint256 available)
```

### INVALID_DENOMINATOR

```solidity
error INVALID_DENOMINATOR(uint256 denominator, uint256 valid)
```

### INVALID_OPERATOR

```solidity
error INVALID_OPERATOR(address who, address valid)
```

### ZERO_SHARES

```solidity
error ZERO_SHARES(address asset)
```

### ZERO_SHARES_OUT

```solidity
error ZERO_SHARES_OUT(address asset, uint256 assets)
```

### ZERO_SHARES_IN

```solidity
error ZERO_SHARES_IN(address asset, uint256 assets)
```

### ZERO_ASSETS

```solidity
error ZERO_ASSETS(address asset)
```

### ZERO_ASSETS_OUT

```solidity
error ZERO_ASSETS_OUT(address asset, uint256 shares)
```

### ZERO_ASSETS_IN

```solidity
error ZERO_ASSETS_IN(address asset, uint256 shares)
```

