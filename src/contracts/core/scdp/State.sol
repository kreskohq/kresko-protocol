// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {CoverAsset, SCDPCollateral, SCDPKrAsset} from "scdp/Types.sol";
import {SCommon} from "scdp/funcs/Common.sol";
import {SDeposits} from "scdp/funcs/Deposits.sol";
import {SAccounts} from "scdp/funcs/Accounts.sol";
import {SDebt} from "scdp/funcs/Debt.sol";
import {Swap} from "scdp/funcs/Swap.sol";
/* -------------------------------------------------------------------------- */
/*                                   Usings                                   */
/* -------------------------------------------------------------------------- */

using SCommon for SCDPState global;
using SDeposits for SCDPState global;
using SAccounts for SCDPState global;
using SDebt for SCDPState global;
using Swap for SCDPState global;

/* -------------------------------------------------------------------------- */
/*                                    State                                   */
/* -------------------------------------------------------------------------- */

/**
 * @title Storage layout for the shared cdp state
 * @author Kresko
 */
struct SCDPState {
    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minCollateralRatio;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
    /// @notice User swap fee receiver
    address swapFeeRecipient;
    /// @notice Liquidation Overflow Multiplier, multiplies max liquidatable value.
    uint256 maxLiquidationMultiplier;
    address feeAsset;
    /// @notice Debt Index State
    SDIState sdi;
    /* -------------------------------------------------------------------------- */
    /*                                 Accounting                                 */
    /* -------------------------------------------------------------------------- */
    /// @notice Mapping of krAsset -> pooled debt
    mapping(address => uint256) debt;
    /// @notice Mapping of collateral -> pooled deposits
    mapping(address => uint256) totalDeposits;
    /// @notice Mapping of asset -> swap owned deposit assets
    mapping(address => uint256) swapDeposits;
    /// @notice Mapping of account -> depositAsset -> deposit amount.
    mapping(address => mapping(address => uint256)) deposits;
    /// @notice Mapping of account -> depositAsset -> principal deposit amount.
    mapping(address => mapping(address => uint256)) depositsPrincipal;
    /* -------------------------------------------------------------------------- */
    /*                             Asset Configuration                            */
    /* -------------------------------------------------------------------------- */
    /// @notice Mapping of depositAsset -> SCDPCollateral configuration
    mapping(address => SCDPCollateral) collateral;
    /// @notice Mapping of krAsset -> SCDPKrAsset configuration
    mapping(address => SCDPKrAsset) krAsset;
    /// @notice Mapping of asset -> asset -> swap enabled
    mapping(address => mapping(address => bool)) isSwapEnabled;
    /// @notice Mapping of asset -> enabled
    mapping(address => bool) isEnabled;
    /// @notice Deposit assets that are enabled
    mapping(address => bool) isDepositEnabled;
    /// @notice Array of assets that are deposit assets and can be swapped
    address[] collaterals;
    /// @notice Array of kresko assets that can be minted and swapped.
    address[] krAssets;
}

struct SDIState {
    uint256 totalDebt;
    uint256 totalCover;
    address coverRecipient;
    mapping(address => CoverAsset) coverAsset;
    address[] coverAssets;
}

/* -------------------------------------------------------------------------- */
/*                                   Getters                                  */
/* -------------------------------------------------------------------------- */

// Storage position
bytes32 constant SCDP_STORAGE_POSITION = keccak256("kresko.scdp.storage");

// solhint-disable func-visibility
function scdp() pure returns (SCDPState storage state) {
    bytes32 position = SCDP_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
