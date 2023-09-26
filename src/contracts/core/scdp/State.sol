// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {CoverAsset, SharedDeposits} from "scdp/Types.sol";
import {SCommon} from "scdp/funcs/Common.sol";
import {SDeposits} from "scdp/funcs/Deposits.sol";
import {SAccounts} from "scdp/funcs/Accounts.sol";
import {SDebt} from "scdp/funcs/Debt.sol";
import {Swap} from "scdp/funcs/Swap.sol";
import {SDebtIndex} from "scdp/funcs/SDI.sol";
/* -------------------------------------------------------------------------- */
/*                                   Usings                                   */
/* -------------------------------------------------------------------------- */

using SCommon for SCDPState global;
using SDeposits for SCDPState global;
using SAccounts for SCDPState global;
using SDebt for SCDPState global;
using Swap for SCDPState global;

using SDebtIndex for SDIState global;

/* -------------------------------------------------------------------------- */
/*                                    State                                   */
/* -------------------------------------------------------------------------- */

/**
 * @title Storage layout for the shared cdp state
 * @author Kresko
 */
struct SCDPState {
    /* -------------------------------------------------------------------------- */
    /*                                 Accounting                                 */
    /* -------------------------------------------------------------------------- */
    /// @notice Mapping of krAsset -> pooled debt
    mapping(address => uint256) debt;
    mapping(address => SharedDeposits) sDeposits;
    // /// @notice Mapping of collateral -> pooled deposits
    // mapping(address => uint256) totalDeposits;
    // /// @notice Mapping of asset -> swap owned deposit assets
    // mapping(address => uint256) swapDeposits;
    /// @notice Mapping of account -> depositAsset -> deposit amount.
    mapping(address => mapping(address => uint256)) deposits;
    /// @notice Mapping of account -> depositAsset -> principal deposit amount.
    mapping(address => mapping(address => uint256)) depositsPrincipal;
    /* -------------------------------------------------------------------------- */
    /*                             Asset Configuration                            */
    /* -------------------------------------------------------------------------- */
    /// @notice Mapping of asset -> asset -> swap enabled
    mapping(address => mapping(address => bool)) isSwapEnabled;
    /// @notice Mapping of asset -> enabled
    mapping(address => bool) isEnabled;
    /// @notice Array of assets that are deposit assets and can be swapped
    address[] collaterals;
    /// @notice Array of kresko assets that can be minted and swapped.
    address[] krAssets;
    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minCollateralRatio;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
    /// @notice Liquidation Overflow Multiplier, multiplies max liquidatable value.
    uint256 maxLiquidationRatio;
    /// @notice User swap fee receiver
    address swapFeeRecipient;
    /// @notice The asset to convert fees into
    address feeAsset;
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
bytes32 constant SDI_STORAGE_POSITION = keccak256("kresko.scdp.sdi.storage");

// solhint-disable func-visibility
function scdp() pure returns (SCDPState storage state) {
    bytes32 position = SCDP_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

function sdi() pure returns (SDIState storage state) {
    bytes32 position = SDI_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
