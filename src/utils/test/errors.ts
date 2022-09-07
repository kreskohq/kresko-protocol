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
    NOT_OWNER = "100",
    NOT_OPERATOR = "101",
    ZERO_WITHDRAW = "102",
    ZERO_DEPOSIT = "103",
    ZERO_ADDRESS = "104",
    ALREADY_INITIALIZED = "105",
    RE_ENTRANCY = "106",
    NOT_ENOUGH_BALANCE = "107",
    NOT_ENOUGH_ALLOWANCE = "108",





    /* -------------------------------------------------------------------------- */
    /*                                   2. Minter                                 */
    /* -------------------------------------------------------------------------- */
    NOT_LIQUIDATABLE = "200",
    ZERO_MINT = "201",
    ZERO_BURN = "202",
    ADDRESS_INVALID_ORACLE = "203",
    ADDRESS_INVALID_NRWT = "204",
    ADDRESS_INVALID_FEERECIPIENT = "205",
    ADDRESS_INVALID_COLLATERAL = "206",
    COLLATERAL_EXISTS = "207",
    COLLATERAL_INVALID_FACTOR = "208",
    COLLATERAL_WITHDRAW_OVERFLOW = "209",
    KRASSET_INVALID_FACTOR = "210",
    KRASSET_BURN_AMOUNT_OVERFLOW = "211",
    KRASSET_EXISTS = "212",
    PARAM_BURN_FEE_TOO_HIGH = "213",
    PARAM_LIQUIDATION_INCENTIVE_LOW = "214",
    PARAM_LIQUIDATION_INCENTIVE_HIGH = "215",
    PARAM_MIN_COLLATERAL_RATIO_LOW = "216",
    PARAM_MIN_DEBT_AMOUNT_HIGH = "217",
    COLLATERAL_DOESNT_EXIST = "218",
    KRASSET_DOESNT_EXIST = "219",
    KRASSET_NOT_MINTABLE = "220",
    KRASSET_SYMBOL_EXISTS = "221",
    KRASSET_COLLATERAL_LOW = "222",
    KRASSET_MINT_AMOUNT_LOW = "223",
    KRASSET_MAX_SUPPLY_REACHED = "224",
    SELF_LIQUIDATION = "225",
    ZERO_REPAY = "226",
    STALE_PRICE = "227",
    LIQUIDATION_OVERFLOW = "228",
    ADDRESS_INVALID_SAFETY_COUNCIL = "229",
    SAFETY_COUNCIL_EXISTS = "230",
    NOT_SAFETY_COUNCIL = "231",
    ACTION_PAUSED_FOR_ASSET = "232",
    INVALID_ASSET_SUPPLIED = "233",
    KRASSET_NOT_WRAPPED = "234",
    INVALID_LT = "235",
    COLLATERAL_INSUFFICIENT_AMOUNT = "236",
    MULTISIG_NOT_ENOUGH_OWNERS = "237",





    /* -------------------------------------------------------------------------- */
    /*                                   3. Staking                               */
    /* -------------------------------------------------------------------------- */
    REWARD_PER_BLOCK_MISSING = "300",
    REWARD_TOKENS_MISSING = "301",
    POOL_EXISTS = "302",
    POOL_DOESNT_EXIST = "303",
    ADDRESS_INVALID_REWARD_RECIPIENT = "304",





    /* -------------------------------------------------------------------------- */
    /*                                   4. Libraries                             */
    /* -------------------------------------------------------------------------- */
    ARRAY_OUT_OF_BOUNDS = "400",
}
