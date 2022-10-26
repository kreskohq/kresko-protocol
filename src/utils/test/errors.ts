/**
 * @author Kresko
 * @title Error codes
 * @notice Kresko-specific revert return values and their explanation
 * @dev First number indicates the domain for the error
 */
export enum Error {
    /* -------------------------------------------------------------------------- */
    /*                                OpenZeppelin                                */
    /* -------------------------------------------------------------------------- */

    ALREADY_INITIALIZED_OZ = "Initializable: contract is already initialized",
    CONTRACT_NOT_INITIALIZING = "Initializable: contract is not initializing",
    /* -------------------------------------------------------------------------- */
    /*                                    Diamond                                 */
    /* -------------------------------------------------------------------------- */

    // Preserve readability for the diamond proxy
    DIAMOND_INVALID_FUNCTION_SIGNATURE = "krDiamond: function does not exist",
    DIAMOND_INVALID_PENDING_OWNER = "krDiamond: Must be pending contract owner",
    DIAMOND_INVALID_OWNER = "krDiamond: Must be diamond owner",

    /* -------------------------------------------------------------------------- */
    /*                                   1. General                               */
    /* -------------------------------------------------------------------------- */

    NOT_OWNER = "100", // The sender must be owner
    NOT_OPERATOR = "101", // The sender must be operator
    ZERO_WITHDRAW = "102", // Withdraw must be greater than 0
    ZERO_DEPOSIT = "103", // Deposit must be greater than 0
    ZERO_ADDRESS = "104", // Address provided cannot be address(0)
    ALREADY_INITIALIZED = "105", // Contract has already been initialized
    RE_ENTRANCY = "106", // Function does not allow re-entrant calls
    NOT_ENOUGH_BALANCE = "107", // Transfer of rebasing token exceeds value
    NOT_ENOUGH_ALLOWANCE = "108", // TransferFrom of rebasing token exceeds allowance

    /* -------------------------------------------------------------------------- */
    /*                                   2. Minter                                 */
    /* -------------------------------------------------------------------------- */

    NOT_LIQUIDATABLE = "200", // Account has collateral deposits exceeding minCollateralValue
    ZERO_MINT = "201", // Mint amount must be greater than 0
    ZERO_BURN = "202", // Burn amount must be greater than 0
    ADDRESS_INVALID_ORACLE = "203", // Oracle address cant be set to address(0)
    ADDRESS_INVALID_NRWT = "204", // Underlying rebasing token address cant be set to address(0)
    ADDRESS_INVALID_FEERECIPIENT = "205", // Fee recipient address cant be set to address(0)
    ADDRESS_INVALID_COLLATERAL = "206", // Collateral address cant be set to address(0)
    COLLATERAL_EXISTS = "207", // Collateral has already been added into the protocol
    COLLATERAL_INVALID_FACTOR = "208", // cFactor must be greater than 1FP
    COLLATERAL_WITHDRAW_OVERFLOW = "209", // Withdraw amount cannot reduce accounts collateral value under minCollateralValue
    KRASSET_INVALID_FACTOR = "210", // kFactor must be greater than 1FP
    KRASSET_BURN_AMOUNT_OVERFLOW = "211", // Repaying more than account has debt
    KRASSET_EXISTS = "212", // Asset is already added
    PARAM_CLOSE_FEE_TOO_HIGH = "213", // "Close fee exceeds MAX_CLOSE_FEE"
    PARAM_LIQUIDATION_INCENTIVE_LOW = "214", // "Liquidation incentive less than MIN_LIQUIDATION_INCENTIVE_MULTIPLIER"
    PARAM_LIQUIDATION_INCENTIVE_HIGH = "215", // "Liquidation incentive greater than MAX_LIQUIDATION_INCENTIVE_MULTIPLIER"
    PARAM_MIN_COLLATERAL_RATIO_LOW = "216", // Minimum collateral ratio less than MIN_COLLATERALIZATION_RATIO
    PARAM_MIN_DEBT_AMOUNT_HIGH = "217", // Minimum debt param argument exceeds MAX_DEBT_VALUE
    COLLATERAL_DOESNT_EXIST = "218", // Collateral does not exist within the protocol
    KRASSET_DOESNT_EXIST = "219", // KrAsset does not exist within the protocol
    KRASSET_NOT_MINTABLE = "220", // KrAsset is not mintable
    KRASSET_SYMBOL_EXISTS = "221", // KrAsset with this symbol is already within the protocl
    KRASSET_COLLATERAL_LOW = "222", // Collateral deposits do not cover the amount being minted
    KRASSET_MINT_AMOUNT_LOW = "223", // Debt position must be greater than the minimum debt position value
    KRASSET_MAX_SUPPLY_REACHED = "224", // KrAsset being minted has reached its current supply limit
    SELF_LIQUIDATION = "225", // Account cannot liquidate itself
    ZERO_REPAY = "226", // Account cannot liquidate itself
    STALE_PRICE = "227", // Price for the asset is stale
    LIQUIDATION_OVERFLOW = "228", // Repaying more USD value than allowed
    ADDRESS_INVALID_SAFETY_COUNCIL = "229", // Account responsible for the safety council role must be a multisig
    SAFETY_COUNCIL_EXISTS = "230", // Only one council role can exist
    NOT_SAFETY_COUNCIL = "231", // Sender must have the role `Role.SAFETY_COUNCIL`
    ACTION_PAUSED_FOR_ASSET = "232", // This action is currently paused for this asset
    INVALID_ASSET_SUPPLIED = "233", // KrAsset supplied is not a collateral nor a krAsset
    KRASSET_NOT_WRAPPED = "234", // krAsset given is not the wrapped version
    INVALID_LT = "235", // Liquidation threshold is greater than minimum collateralization ratio
    COLLATERAL_INSUFFICIENT_AMOUNT = "236", // Insufficient amount of collateral to complete the operation
    MULTISIG_NOT_ENOUGH_OWNERS = "237", // Multisig has invalid amount of owners
    PARAM_OPEN_FEE_TOO_HIGH = "238", // "Close fee exceeds MAX_OPEN_FEE"
    INVALID_FEE_TYPE = "239", // "Invalid fee type
    KRASSET_INVALID_ANCHOR = "240", // KrAsset anchor does not support the correct interfaceId
    KRASSET_INVALID_CONTRACT = "241", // KrAsset does not support the correct interfaceId
    KRASSET_MARKET_CLOSED = "242", // KrAsset's market is currently closed
    /* -------------------------------------------------------------------------- */
    /*                                   3. Staking                               */
    /* -------------------------------------------------------------------------- */

    REWARD_PER_BLOCK_MISSING = "300", // Each reward token must have a reward per block value
    REWARD_TOKENS_MISSING = "301", // Pool must include an array of reward token addresses
    POOL_EXISTS = "302", // Pool with this deposit token already exists
    POOL_DOESNT_EXIST = "303", // Pool with this deposit token does not exist
    ADDRESS_INVALID_REWARD_RECIPIENT = "304", // Reward recipient cant be address(0)

    /* -------------------------------------------------------------------------- */
    /*                                   4. Libraries                             */
    /* -------------------------------------------------------------------------- */

    ARRAY_OUT_OF_BOUNDS = "400", // Array out of bounds error
}
