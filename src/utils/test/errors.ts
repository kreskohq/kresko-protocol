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

    NOT_OWNER = "100", // The sender must be owne,
    NOT_OPERATOR = "101", // The sender must be operato,
    ZERO_WITHDRAW = "102", // Withdraw must be greater than ,
    ZERO_DEPOSIT = "103", // Deposit must be greater than ,
    ZERO_ADDRESS = "104", // Address provided cannot be address(0,
    ALREADY_INITIALIZED = "105", // Contract has already been initialize,
    RE_ENTRANCY = "106", // Function does not allow re-entrant call,
    NOT_ENOUGH_BALANCE = "107", // Transfer of rebasing token exceeds valu,
    NOT_ENOUGH_ALLOWANCE = "108", // TransferFrom of rebasing token exceeds allowanc,

    /* -------------------------------------------------------------------------- */
    /*                                   2. Minter                                 */
    /* -------------------------------------------------------------------------- */

    NOT_LIQUIDATABLE = "200", // Account has collateral deposits exceeding minCollateralValu,
    ZERO_MINT = "201", // Mint amount must be greater than ,
    ZERO_BURN = "202", // Burn amount must be greater than ,
    ADDRESS_INVALID_ORACLE = "203", // Oracle address cant be set to address(0,
    ADDRESS_INVALID_NRWT = "204", // Underlying rebasing token address cant be set to address(0,
    ADDRESS_INVALID_FEERECIPIENT = "205", // Fee recipient address cant be set to address(0,
    ADDRESS_INVALID_COLLATERAL = "206", // Collateral address cant be set to address(0,
    COLLATERAL_EXISTS = "207", // Collateral has already been added into the protoco,
    COLLATERAL_INVALID_FACTOR = "208", // cFactor must be greater than 1F,
    COLLATERAL_WITHDRAW_OVERFLOW = "209", // Withdraw amount cannot reduce accounts collateral value under minCollateralValu,
    KRASSET_INVALID_FACTOR = "210", // kFactor must be greater than 1F,
    KRASSET_BURN_AMOUNT_OVERFLOW = "211", // Repaying more than account has deb,
    KRASSET_EXISTS = "212", // KrAsset is already adde,
    PARAM_CLOSE_FEE_TOO_HIGH = "213", // "Close fee exceeds MAX_CLOSE_FEE,
    PARAM_LIQUIDATION_INCENTIVE_LOW = "214", // "Liquidation incentive less than MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
    PARAM_LIQUIDATION_INCENTIVE_HIGH = "215", // "Liquidation incentive greater than MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
    PARAM_MIN_COLLATERAL_RATIO_LOW = "216", // Minimum collateral ratio less than MIN_COLLATERALIZATION_RATI,
    PARAM_MIN_DEBT_AMOUNT_HIGH = "217", // Minimum debt param argument exceeds MAX_DEBT_VALU,
    COLLATERAL_DOESNT_EXIST = "218", // Collateral does not exist within the protoco,
    KRASSET_DOESNT_EXIST = "219", // KrAsset does not exist within the protoco,
    KRASSET_NOT_MINTABLE = "220", // KrAsset is not mintabl,
    KRASSET_SYMBOL_EXISTS = "221", // KrAsset with this symbol is already within the protoc,
    KRASSET_COLLATERAL_LOW = "222", // Collateral deposits do not cover the amount being minte,
    KRASSET_MINT_AMOUNT_LOW = "223", // Debt position must be greater than the minimum debt position valu,
    KRASSET_MAX_SUPPLY_REACHED = "224", // KrAsset being minted has reached its current supply limi,
    SELF_LIQUIDATION = "225", // Account cannot liquidate itsel,
    ZERO_REPAY = "226", // Account cannot liquidate itsel,
    STALE_PRICE = "227", // Price for the asset is stal,
    LIQUIDATION_OVERFLOW = "228", // Repaying more USD value than allowe,
    ADDRESS_INVALID_SAFETY_COUNCIL = "229", // Account responsible for the safety council role must be a multisi,
    SAFETY_COUNCIL_EXISTS = "230", // Only one council role can exis,
    NOT_SAFETY_COUNCIL = "231", // Sender must have the role `Role.SAFETY_COUNCIL,
    ACTION_PAUSED_FOR_ASSET = "232", // This action is currently paused for this asse,
    INVALID_ASSET_SUPPLIED = "233", // Asset supplied is not a collateral nor a krAsse,
    KRASSET_NOT_ANCHOR = "234", // Address is not the anchor for the krAsse,
    INVALID_LT = "235", // Liquidation threshold is greater than minimum collateralization rati,
    COLLATERAL_INSUFFICIENT_AMOUNT = "236", // Insufficient amount of collateral to complete the operatio,
    MULTISIG_NOT_ENOUGH_OWNERS = "237", // Multisig has invalid amount of owner,
    PARAM_OPEN_FEE_TOO_HIGH = "238", // "Close fee exceeds MAX_OPEN_FEE,
    INVALID_FEE_TYPE = "239", // "Invalid fee typ,
    KRASSET_INVALID_ANCHOR = "240", // krAsset anchor does not support the correct interfaceI,
    KRASSET_INVALID_CONTRACT = "241", // krAsset does not support the correct interfaceI,
    KRASSET_MARKET_CLOSED = "242", // KrAsset's market is currently close,
    NO_KRASSETS_MINTED = "243", // Account has no active KreskoAsset positions
    NO_COLLATERAL_DEPOSITS = "244", // Account has no active Collateral deposits
    INVALID_ORACLE_DECIMALS = "245", // Oracle decimals do not match extOracleDecimals
    PARAM_LIQUIDATION_OVERFLOW_LOW = "246", // Liquidation overflow is less than MIN_LIQUIDATION_OVERFLOW
    INVALID_ORACLE_DEVIATION_PCT = "247", // Oracle deviation percentage is greater than 100%
    SEIZED_COLLATERAL_UNDERFLOW = "248", // Amount of collateral seized is less than the amount calculated.
    COLLATERAL_AMOUNT_TOO_LOW = "249", // Amount of krAsset collateral being deposited is less than the minimum amount

    /* -------------------------------------------------------------------------- */
    /*                                   3. Staking                               */
    /* -------------------------------------------------------------------------- */

    REWARD_PER_BLOCK_MISSING = "300", // Each reward token must have a reward per block valu,
    REWARD_TOKENS_MISSING = "301", // Pool must include an array of reward token addresse,
    POOL_EXISTS = "302", // Pool with this deposit token already exist,
    POOL_DOESNT_EXIST = "303", // Pool with this deposit token does not exis,
    ADDRESS_INVALID_REWARD_RECIPIENT = "304", // Reward recipient cant be address(0,

    /* -------------------------------------------------------------------------- */
    /*                                   4. Libraries                             */
    /* -------------------------------------------------------------------------- */

    ARRAY_OUT_OF_BOUNDS = "400", // Array out of bounds erro,
    PRICEFEEDS_MUST_MATCH_STATUS_FEEDS = "401", // Supplied price feeds must match status feeds in lengt,

    /* -------------------------------------------------------------------------- */
    /*                                   5. KrAsset                               */
    /* -------------------------------------------------------------------------- */

    REBASING_DENOMINATOR_LOW = "500", // denominator of rebases must be >= ,
    ISSUER_NOT_KRESKO = "501", // issue must be done by kresk,
    REDEEMER_NOT_KRESKO = "502", // redeem must be done by kresk,
    DESTROY_OVERFLOW = "503", // trying to destroy more than allowe,
    ISSUE_OVERFLOW = "504", // trying to destroy more than allowe,
    MINT_OVERFLOW = "505", // trying to destroy more than allowe,
    DEPOSIT_OVERFLOW = "506", // trying to destroy more than allowe,
    REDEEM_OVERFLOW = "507", // trying to destroy more than allowe,
    WITHDRAW_OVERFLOW = "508", // trying to destroy more than allowe,
    ZERO_SHARES = "509", // amount of shares must be greater than ,
    ZERO_ASSETS = "510", // amount of assets must be greater than ,
    INVALID_SCALED_AMOUNT = "511", // amount of debt scaled must be greater than ,

    /* -------------------------------------------------------------------------- */
    /*                              6. STABILITY RATES                            */
    /* -------------------------------------------------------------------------- */

    STABILITY_RATES_ALREADY_INITIALIZED = "601", // stability rates for the asset are already initialize,
    INVALID_OPTIMAL_RATE = "602", // the optimal price rate configured is less than 1e27 for the asse,
    INVALID_PRICE_RATE_DELTA = "603", // the price rate delta configured is less than 1e27 for the asse,
    STABILITY_RATES_NOT_INITIALIZED = "604", // the stability rates for the asset are not initialize,
    STABILITY_RATE_OVERFLOW = "605", // the stability rates is > max uint12,
    DEBT_INDEX_OVERFLOW = "606", // the debt index is > max uint12,
    KISS_NOT_SET = "607", // the debt index is > max uint12,
    STABILITY_RATE_REPAYMENT_AMOUNT_ZERO = "608", // interest being repaid cannot be ,
    STABILITY_RATE_INTEREST_IS_ZERO = "609", // account must have accrued interest to repay i,
    INTEREST_REPAY_NOT_PARTIAL = "610", // account must have accrued interest to repay i,

    /* -------------------------------------------------------------------------- */
    /*                              7. AMM ORACLE                                 */
    /* -------------------------------------------------------------------------- */

    PAIR_ADDRESS_IS_ZERO = "701", // Pair address to configure cannot be zer,
    INVALID_UPDATE_PERIOD = "702", // Update period must be greater than the minimu,
    PAIR_ALREADY_EXISTS = "703", // Pair with the address is already initialize,
    PAIR_DOES_NOT_EXIST = "704", // Pair supplied does not exis,
    INVALID_LIQUIDITY = "706", // Pair initializaition requires that the pair has liquidit,
    UPDATE_PERIOD_NOT_FINISHED = "707", // Update can only be called once per update perio,
    INVALID_PAIR = "708", // Pair being consulted does not have the token that the price was requested fo,
}
