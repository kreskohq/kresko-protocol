"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Error = void 0;
/**
 * @author Kresko
 * @title Error codes
 * @notice Kresko-specific revert return values and their explanation
 * @dev First number indicates the domain for the error
 */
var Error;
(function (Error) {
    /* -------------------------------------------------------------------------- */
    /*                                OpenZeppelin                                */
    /* -------------------------------------------------------------------------- */
    Error["ALREADY_INITIALIZED_OZ"] = "Initializable: contract is already initialized";
    Error["CONTRACT_NOT_INITIALIZING"] = "Initializable: contract is not initializing";
    /* -------------------------------------------------------------------------- */
    /*                                    Diamond                                 */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /*                                    Diamond                                 */
    /* -------------------------------------------------------------------------- */
    // Preserve readability for the diamond proxy
    Error["DIAMOND_INVALID_FUNCTION_SIGNATURE"] = "krDiamond: function does not exist";
    Error["DIAMOND_INVALID_PENDING_OWNER"] = "krDiamond: Must be pending contract owner";
    Error["DIAMOND_INVALID_OWNER"] = "krDiamond: Must be diamond owner";
    /* -------------------------------------------------------------------------- */
    /*                                   1. General                               */
    /* -------------------------------------------------------------------------- */
    Error["NOT_OWNER"] = "100";
    Error["NOT_OPERATOR"] = "101";
    Error["ZERO_WITHDRAW"] = "102";
    Error["ZERO_DEPOSIT"] = "103";
    Error["ZERO_ADDRESS"] = "104";
    Error["ALREADY_INITIALIZED"] = "105";
    Error["RE_ENTRANCY"] = "106";
    Error["NOT_ENOUGH_BALANCE"] = "107";
    Error["NOT_ENOUGH_ALLOWANCE"] = "108";
    /* -------------------------------------------------------------------------- */
    /*                                   2. Minter                                 */
    /* -------------------------------------------------------------------------- */
    Error["NOT_LIQUIDATABLE"] = "200";
    Error["ZERO_MINT"] = "201";
    Error["ZERO_BURN"] = "202";
    Error["ADDRESS_INVALID_ORACLE"] = "203";
    Error["ADDRESS_INVALID_NRWT"] = "204";
    Error["ADDRESS_INVALID_FEERECIPIENT"] = "205";
    Error["ADDRESS_INVALID_COLLATERAL"] = "206";
    Error["COLLATERAL_EXISTS"] = "207";
    Error["COLLATERAL_INVALID_FACTOR"] = "208";
    Error["COLLATERAL_WITHDRAW_OVERFLOW"] = "209";
    Error["KRASSET_INVALID_FACTOR"] = "210";
    Error["KRASSET_BURN_AMOUNT_OVERFLOW"] = "211";
    Error["KRASSET_EXISTS"] = "212";
    Error["PARAM_CLOSE_FEE_TOO_HIGH"] = "213";
    Error["PARAM_LIQUIDATION_INCENTIVE_LOW"] = "214";
    Error["PARAM_LIQUIDATION_INCENTIVE_HIGH"] = "215";
    Error["PARAM_MIN_COLLATERAL_RATIO_LOW"] = "216";
    Error["PARAM_MIN_DEBT_AMOUNT_HIGH"] = "217";
    Error["COLLATERAL_DOESNT_EXIST"] = "218";
    Error["KRASSET_DOESNT_EXIST"] = "219";
    Error["KRASSET_NOT_MINTABLE"] = "220";
    Error["KRASSET_SYMBOL_EXISTS"] = "221";
    Error["KRASSET_COLLATERAL_LOW"] = "222";
    Error["KRASSET_MINT_AMOUNT_LOW"] = "223";
    Error["KRASSET_MAX_SUPPLY_REACHED"] = "224";
    Error["SELF_LIQUIDATION"] = "225";
    Error["ZERO_REPAY"] = "226";
    Error["STALE_PRICE"] = "227";
    Error["LIQUIDATION_OVERFLOW"] = "228";
    Error["ADDRESS_INVALID_SAFETY_COUNCIL"] = "229";
    Error["SAFETY_COUNCIL_EXISTS"] = "230";
    Error["NOT_SAFETY_COUNCIL"] = "231";
    Error["ACTION_PAUSED_FOR_ASSET"] = "232";
    Error["INVALID_ASSET_SUPPLIED"] = "233";
    Error["KRASSET_NOT_ANCHOR"] = "234";
    Error["INVALID_LT"] = "235";
    Error["COLLATERAL_INSUFFICIENT_AMOUNT"] = "236";
    Error["MULTISIG_NOT_ENOUGH_OWNERS"] = "237";
    Error["PARAM_OPEN_FEE_TOO_HIGH"] = "238";
    Error["INVALID_FEE_TYPE"] = "239";
    Error["KRASSET_INVALID_ANCHOR"] = "240";
    Error["KRASSET_INVALID_CONTRACT"] = "241";
    Error["KRASSET_MARKET_CLOSED"] = "242";
    /* -------------------------------------------------------------------------- */
    /*                                   3. Staking                               */
    /* -------------------------------------------------------------------------- */
    Error["REWARD_PER_BLOCK_MISSING"] = "300";
    Error["REWARD_TOKENS_MISSING"] = "301";
    Error["POOL_EXISTS"] = "302";
    Error["POOL_DOESNT_EXIST"] = "303";
    Error["ADDRESS_INVALID_REWARD_RECIPIENT"] = "304";
    /* -------------------------------------------------------------------------- */
    /*                                   4. Libraries                             */
    /* -------------------------------------------------------------------------- */
    Error["ARRAY_OUT_OF_BOUNDS"] = "400";
    Error["PRICEFEEDS_MUST_MATCH_STATUS_FEEDS"] = "401";
    /* -------------------------------------------------------------------------- */
    /*                                   5. KrAsset                               */
    /* -------------------------------------------------------------------------- */
    Error["REBASING_DENOMINATOR_LOW"] = "500";
    Error["ISSUER_NOT_KRESKO"] = "501";
    Error["REDEEMER_NOT_KRESKO"] = "502";
    Error["DESTROY_OVERFLOW"] = "503";
    Error["ISSUE_OVERFLOW"] = "504";
    Error["MINT_OVERFLOW"] = "505";
    Error["DEPOSIT_OVERFLOW"] = "506";
    Error["REDEEM_OVERFLOW"] = "507";
    Error["WITHDRAW_OVERFLOW"] = "508";
    Error["ZERO_SHARES"] = "509";
    Error["ZERO_ASSETS"] = "510";
    Error["INVALID_SCALED_AMOUNT"] = "511";
    /* -------------------------------------------------------------------------- */
    /*                              6. STABILITY RATES                            */
    /* -------------------------------------------------------------------------- */
    Error["STABILITY_RATES_ALREADY_INITIALIZED"] = "601";
    Error["INVALID_OPTIMAL_RATE"] = "602";
    Error["INVALID_PRICE_RATE_DELTA"] = "603";
    Error["STABILITY_RATES_NOT_INITIALIZED"] = "604";
    Error["STABILITY_RATE_OVERFLOW"] = "605";
    Error["DEBT_INDEX_OVERFLOW"] = "606";
    Error["KISS_NOT_SET"] = "607";
    Error["STABILITY_RATE_REPAYMENT_AMOUNT_ZERO"] = "608";
    Error["STABILITY_RATE_INTEREST_IS_ZERO"] = "609";
    Error["INTEREST_REPAY_NOT_PARTIAL"] = "610";
    /* -------------------------------------------------------------------------- */
    /*                              7. AMM ORACLE                                 */
    /* -------------------------------------------------------------------------- */
    Error["PAIR_ADDRESS_IS_ZERO"] = "701";
    Error["INVALID_UPDATE_PERIOD"] = "702";
    Error["PAIR_ALREADY_EXISTS"] = "703";
    Error["PAIR_DOES_NOT_EXIST"] = "704";
    Error["INVALID_LIQUIDITY"] = "706";
    Error["UPDATE_PERIOD_NOT_FINISHED"] = "707";
    Error["INVALID_PAIR"] = "708";
})(Error = exports.Error || (exports.Error = {}));
