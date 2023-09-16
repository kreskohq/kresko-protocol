// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {CoverAsset, PoolCollateral, PoolKrAsset} from "scdp/Types.sol";
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
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minCollateralRatio;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
    /// @notice Mapping of krAsset -> pooled debt
    mapping(address => uint256) debt;
    /// @notice Mapping of collateral -> pooled deposits
    mapping(address => uint256) totalDeposits;
    /// @notice Mapping of asset -> swap owned collateral deposits
    mapping(address => uint256) swapDeposits;
    /// @notice Mapping of account -> collateral -> collateral deposits.
    mapping(address => mapping(address => uint256)) deposits;
    /// @notice Mapping of account -> collateral -> principal collateral deposits.
    mapping(address => mapping(address => uint256)) depositsPrincipal;
    /// @notice Mapping of collateral -> PoolCollateral
    mapping(address => PoolCollateral) poolCollateral;
    /// @notice Mapping of krAsset -> PoolKreskoAsset
    mapping(address => PoolKrAsset) poolKrAsset;
    /// @notice Mapping of asset -> asset -> swap enabled
    mapping(address => mapping(address => bool)) isSwapEnabled;
    /// @notice Mapping of asset -> enabled
    mapping(address => bool) isEnabled;
    /// @notice Array of collateral assets that can be deposited
    address[] collaterals;
    /// @notice Array of kresko assets that can be minted and swapped.
    address[] krAssets;
    /// @notice User swap fee receiver
    address swapFeeRecipient;
    /// @notice Liquidation Overflow Multiplier, multiplies max liquidatable value.
    uint256 maxLiquidationMultiplier;
    address feeAsset;
    /// @notice Debt Index State
    SDIState sdi;
}

struct SDIState {
    uint256 totalDebt;
    uint256 totalCover;
    address coverRecipient;
    mapping(address => CoverAsset) coverAssets;
    address[] coverAssetList;
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
