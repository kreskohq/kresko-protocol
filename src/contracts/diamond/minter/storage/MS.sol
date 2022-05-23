// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../../../libraries/FixedPoint.sol";
import "../../../libraries/FixedPointMath.sol";
import "../../../libraries/Arrays.sol";

/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

/*
 * Storage for the Kresko minter app.
 */

/*
 * ==================================================
 * =================== Structs ======================
 * ==================================================
 */

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param underlyingRebasingToken If the collateral asset is an instance of NonRebasingWrapperToken,
 * this is set to the underlying token that rebases. Otherwise, this is the zero address.
 * Added so that Kresko.sol can handle NonRebasingWrapperTokens with fewer transactions.
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 */
struct CollateralAsset {
    FixedPoint.Unsigned factor;
    address underlyingRebasingToken;
    uint8 decimals;
    bool exists;
}

/**
 * @notice Information on a token that is a Kresko asset.
 * @dev Each Kresko asset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for Kresko asset debt.
 * @param oracle The oracle that provides the USD price of one Kresko asset.
 * @param exists Whether the Kresko asset exists within the protocol.
 * @param mintable Whether the Kresko asset can be minted.
 * @param marketCapUSDLimit The market capitalization limit in USD of the Kresko asset.
 */
struct KrAsset {
    FixedPoint.Unsigned kFactor;
    bool exists;
    bool mintable;
    uint256 marketCapUSDLimit;
}

struct MiStorage {
    // domain separator
    bytes32 domainSeparator;
    // owner of the contract
    address contractOwner;
    // pending new owner
    address pendingOwner;
    // is the diamond initialized
    bool initialized;
}

library MS {
    /* -------------------------------------------------------------------------- */
    /*                                  Constants                                 */
    /* -------------------------------------------------------------------------- */

    uint256 constant ONE_HUNDRED_PERCENT = 1e18;

    //  The maximum configurable burn fee.
    uint256 constant MAX_BURN_FEE = 5e16; // 5%

    // The minimum configurable minimum collateralization ratio.
    uint256 constant MIN_COLLATERALIZATION_RATIO = 1e18; // 100%

    // The minimum configurable liquidation incentive multiplier.
    // This means liquidator only receives equal amount of collateral to debt repaid.
    uint256 constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = 1e18; // 100%

    // The maximum configurable liquidation incentive multiplier.
    // This means liquidator receives 25% bonus collateral compared to the debt repaid.
    uint256 constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25e18; // 125%

    // The maximum configurable minimum debt USD value.
    uint256 constant MAX_DEBT_VALUE = 1000e18; // $1,000

    /* -------------------------------------------------------------------------- */
    /*                                   Storage                                  */
    /* -------------------------------------------------------------------------- */

    bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

    function s() internal pure returns (MiStorage storage ms_) {
        bytes32 position = MINTER_STORAGE_POSITION;
        assembly {
            ms_.slot := position
        }
    }
}
