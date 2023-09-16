// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {Action, SafetyState, CollateralAsset, KrAsset} from "./Types.sol";
import {MAccounts} from "./funcs/Accounts.sol";
import {MCore} from "./funcs/Core.sol";

/* -------------------------------------------------------------------------- */
/*                                   Usings                                   */
/* -------------------------------------------------------------------------- */

using MAccounts for MinterState global;
using MCore for MinterState global;

/**
 * @title Storage layout for the minter state
 * @author Kresko
 */
struct MinterState {
    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */

    /// @notice The recipient of protocol fees.
    address feeRecipient;
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minCollateralRatio;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    uint256 minDebtValue;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
    /// @notice Flag tells if there is a need to perform safety checks on user actions
    bool safetyStateSet;
    /// @notice asset -> action -> state
    mapping(address => mapping(Action => SafetyState)) safetyState;
    /* -------------------------------------------------------------------------- */
    /*                              Collateral Assets                             */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of collateral asset token address to information on the collateral asset.
    mapping(address => CollateralAsset) collateralAssets;
    /**
     * @notice Mapping of account -> asset -> deposit amount
     */
    mapping(address => mapping(address => uint256)) collateralDeposits;
    /// @notice Mapping of account -> collateral asset addresses deposited
    mapping(address => address[]) depositedCollateralAssets;
    /* -------------------------------------------------------------------------- */
    /*                                Kresko Assets                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of kresko asset token address to information on the Kresko asset.
    mapping(address => KrAsset) kreskoAssets;
    /// @notice Mapping of account -> krAsset -> debt amount owed to the protocol
    mapping(address => mapping(address => uint256)) kreskoAssetDebt;
    /// @notice Mapping of account -> addresses of borrowed krAssets
    mapping(address => address[]) mintedKreskoAssets;
    /// @notice Offchain oracle decimals
    uint8 extOracleDecimals;
    /// @notice Liquidation Overflow Multiplier, multiplies max liquidatable value.
    uint256 maxLiquidationMultiplier;
    /* -------------------------------------------------------------------------- */
    /*                                  ORACLE                                  */
    /* -------------------------------------------------------------------------- */

    /// @notice The oracle deviation percentage between the main oracle and fallback oracle.
    uint256 oracleDeviationPct;
    /// @notice L2 sequencer feed address
    address sequencerUptimeFeed;
    /// @notice grace period of sequencer in seconds
    uint256 sequencerGracePeriodTime;
    /// @notice timeout for oracle in seconds
    uint256 oracleTimeout;
}

/* -------------------------------------------------------------------------- */
/*                                   Getter                                   */
/* -------------------------------------------------------------------------- */

// Storage position
bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

function ms() pure returns (MinterState storage state) {
    bytes32 position = MINTER_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
