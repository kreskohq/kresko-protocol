// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

/* solhint-disable max-line-length */

/**
 * @author Kresko
 * @title Error codes
 * @notice Kresko-specific revert return values and their explanation
 * @dev First number indicates the domain for the error
 */
library Error {
    /* -------------------------------------------------------------------------- */
    /*                                    Diamond                                 */
    /* -------------------------------------------------------------------------- */

    // Preserve readability for the diamond proxy
    string public constant DIAMOND_INVALID_FUNCTION_SIGNATURE = "krDiamond: function does not exist";
    string public constant DIAMOND_INVALID_PENDING_OWNER = "krDiamond: Must be pending contract owner";
    string public constant DIAMOND_INVALID_OWNER = "krDiamond: Must be diamond owner";

    /* -------------------------------------------------------------------------- */
    /*                                   1. General                               */
    /* -------------------------------------------------------------------------- */

    string public constant NOT_OWNER = "100"; // The sender must be owner
    string public constant NOT_OPERATOR = "101"; // The sender must be operator
    string public constant ZERO_WITHDRAW = "102"; // Withdraw must be greater than 0
    string public constant ZERO_DEPOSIT = "103"; // Deposit must be greater than 0
    string public constant ZERO_ADDRESS = "104"; // Address provided cannot be address(0)
    string public constant ALREADY_INITIALIZED = "105"; // Contract has already been initialized
    string public constant RE_ENTRANCY = "106"; // Function does not allow re-entrant calls
    string public constant NOT_ENOUGH_BALANCE = "107"; // Transfer of elastic token exceeds value
    string public constant NOT_ENOUGH_ALLOWANCE = "108"; // TransferFrom of elastic token exceeds allowance

    /* -------------------------------------------------------------------------- */
    /*                                   2. Minter                                 */
    /* -------------------------------------------------------------------------- */

    string public constant NOT_LIQUIDATABLE = "200"; // Account has collateral deposits exceeding minCollateralValue
    string public constant ZERO_MINT = "201"; // Mint amount must be greater than 0
    string public constant ZERO_BURN = "202"; // Burn amount must be greater than 0
    string public constant ADDRESS_INVALID_ORACLE = "203"; // Oracle address cant be set to address(0)
    string public constant ADDRESS_INVALID_NRWT = "204"; // Underlying rebasing token address cant be set to address(0)
    string public constant ADDRESS_INVALID_FEERECIPIENT = "205"; // Fee recipient address cant be set to address(0)
    string public constant ADDRESS_INVALID_COLLATERAL = "206"; // Collateral address cant be set to address(0)
    string public constant COLLATERAL_EXISTS = "207"; // Collateral has already been added into the protocol
    string public constant COLLATERAL_INVALID_FACTOR = "208"; // cFactor must be greater than 1FP
    string public constant COLLATERAL_WITHDRAW_OVERFLOW = "209"; // Withdraw amount cannot reduce accounts collateral value under minCollateralValue
    string public constant KRASSET_INVALID_FACTOR = "210"; // kFactor must be greater than 1FP
    string public constant KRASSET_BURN_AMOUNT_OVERFLOW = "211"; // Repaying more than account has debt
    string public constant KRASSET_EXISTS = "212"; // Asset is already added
    string public constant PARAM_BURN_FEE_TOO_HIGH = "213"; // "Burn fee exceeds MAX_BURN_FEE"
    string public constant PARAM_LIQUIDATION_INCENTIVE_LOW = "214"; // "Liquidation incentive less than MIN_LIQUIDATION_INCENTIVE_MULTIPLIER"
    string public constant PARAM_LIQUIDATION_INCENTIVE_HIGH = "215"; // "Liquidation incentive greater than MAX_LIQUIDATION_INCENTIVE_MULTIPLIER"
    string public constant PARAM_MIN_COLLATERAL_RATIO_LOW = "216"; // Minimum collateral ratio less than MIN_COLLATERALIZATION_RATIO
    string public constant PARAM_MIN_DEBT_AMOUNT_HIGH = "217"; // Minimum debt param argument exceeds MAX_DEBT_VALUE
    string public constant COLLATERAL_DOESNT_EXIST = "218"; // Collateral does not exist within the protocol
    string public constant KRASSET_DOESNT_EXIST = "219"; // KrAsset does not exist within the protocol
    string public constant KRASSET_NOT_MINTABLE = "220"; // KrAsset is not mintable
    string public constant KRASSET_SYMBOL_EXISTS = "221"; // KrAsset with this symbol is already within the protocl
    string public constant KRASSET_COLLATERAL_LOW = "222"; // Collateral deposits do not cover the amount being minted
    string public constant KRASSET_MINT_AMOUNT_LOW = "223"; // Debt position must be greater than the minimum debt position value
    string public constant KRASSET_MAX_SUPPLY_REACHED = "224"; // Asset being minted has reached its current supply limit
    string public constant SELF_LIQUIDATION = "225"; // Account cannot liquidate itself
    string public constant ZERO_REPAY = "226"; // Account cannot liquidate itself
    string public constant STALE_PRICE = "227"; // Price for the asset is stale
    string public constant LIQUIDATION_OVERFLOW = "228"; // Repaying more USD value than allowed
    string public constant ADDRESS_INVALID_SAFETY_COUNCIL = "229"; // Account responsible for the safety council role must be a multisig
    string public constant SAFETY_COUNCIL_EXISTS = "230"; // Only one council role can exist
    string public constant NOT_SAFETY_COUNCIL = "231"; // Sender must have the role `Role.SAFETY_COUNCIL`
    string public constant ACTION_PAUSED_FOR_ASSET = "232"; // This action is currently paused for this asset
    string public constant INVALID_ASSET_SUPPLIED = "233"; // Asset supplied is not a collateral nor a krAsset
    string public constant KRASSET_NOT_WRAPPED = "234"; // krAsset given is not the wrapped version
    string public constant INVALID_LT = "235"; // Liquidation threshold is greater than minimum collateralization ratio
    string public constant COLLATERAL_INSUFFICIENT_AMOUNT = "236"; // Insufficient amount of collateral to complete the operation


    /* -------------------------------------------------------------------------- */
    /*                                   3. Staking                               */
    /* -------------------------------------------------------------------------- */

    string public constant REWARD_PER_BLOCK_MISSING = "300"; // Each reward token must have a reward per block value
    string public constant REWARD_TOKENS_MISSING = "301"; // Pool must include an array of reward token addresses
    string public constant POOL_EXISTS = "302"; // Pool with this deposit token already exists
    string public constant POOL_DOESNT_EXIST = "303"; // Pool with this deposit token does not exist
    string public constant ADDRESS_INVALID_REWARD_RECIPIENT = "304"; // Reward recipient cant be address(0)

    /* -------------------------------------------------------------------------- */
    /*                                   4. Libraries                             */
    /* -------------------------------------------------------------------------- */

    string public constant ARRAY_OUT_OF_BOUNDS = "400"; // Array out of bounds error
}
