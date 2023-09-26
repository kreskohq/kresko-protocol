// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {CAsset} from "common/funcs/Asset.sol";

using CAsset for Asset global;

/* -------------------------------------------------------------------------- */
/*                               Access Control                               */
/* -------------------------------------------------------------------------- */

library Role {
    /// @dev role that grants other roles
    bytes32 internal constant DEFAULT_ADMIN = 0x00;
    /// @dev  keccak256("kresko.roles.minter.admin")
    bytes32 internal constant ADMIN = 0xb9dacdf02281f2e98ddbadaaf44db270b3d5a916342df47c59f77937a6bcd5d8;
    /// @dev keccak256("kresko.roles.minter.operator")
    bytes32 internal constant OPERATOR = 0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd;
    /// @dev keccak256("kresko.roles.minter.manager")
    bytes32 internal constant MANAGER = 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0;
    /// @dev keccak256("kresko.roles.minter.safety.council")
    bytes32 internal constant SAFETY_COUNCIL = 0x9c387ecf1663f9144595993e2c602b45de94bf8ba3a110cb30e3652d79b581c0;
}

/* -------------------------------------------------------------------------- */
/*                                 Reentrancy                                 */
/* -------------------------------------------------------------------------- */

/// @dev set the initial value to 1 as we do not
/// wanna hinder possible gas refunds by setting it to 0 on exit.
uint256 constant NOT_ENTERED = 1;
uint256 constant ENTERED = 2;

/* ========================================================================== */
/*                                   Structs                                  */
/* ========================================================================== */
struct Oracle {
    address feed;
    function(address) external view returns (uint256) priceGetter;
}

enum OracleType {
    Redstone,
    Chainlink,
    API3
}

struct FeedConfiguration {
    OracleType[2] oracleIds;
    address[2] feeds;
}

/**
 * @notice Information on an asset that can be used within the protocol.
 */
struct Asset {
    /// @notice The bytes identifier, eg. bytes32('ETH'), derived from Redstone ID. Used mainly for oracle
    bytes32 id;
    /// @notice The collateral factor used for calculating the value of the collateral.
    uint256 factor;
    /// @notice The KFactor which is reverse of cFactor.
    uint256 kFactor;
    /// @notice The supply limit if the asset is a Kresko Asset.
    uint256 supplyLimit;
    /// @notice The fee when minted through the Minter.
    uint256 openFee;
    /// @notice The fee when burned through the Minter.
    uint256 closeFee;
    /// @notice The fee when asset is the "Asset In" in SCDP swaps.
    uint256 openFeeSCDP;
    /// @notice The fee when asset is the "Asset Out" in SCDP swaps.
    uint256 closeFeeSCDP;
    /// @notice The protocol fee share when used in SCDP swaps
    uint256 protocolFeeSCDP;
    /// @notice The liquidation incentive when seized in Minter liquidations.
    uint256 liquidationIncentive;
    /// @notice The liquidation incentive when repaid in SCDP liquidations.
    uint256 liquidationIncentiveSCDP;
    /// @notice The scaled index for the asset, used for fee sharing in SCDP deposits.
    uint256 liquidityIndexSCDP; // no need to pack this, it's not used with depositLimit
    /// @notice The deposit amount limit within SCDP deposits.
    uint256 depositLimitSCDP;
    /// @notice If the asset is a KreskoAsset, the anchor address.
    address anchor;
    /// @notice The oracle ordering for the asset.
    OracleType[2] oracles;
    /// @notice The decimals for the token, stored here to avoid repetitive external calls.
    uint8 decimals;
    /// @notice Whether the collateral asset exists in the Minter.
    bool isCollateral;
    /// @notice Whether the asset is mintable through the Minter.
    bool isKrAsset;
    /// @notice Whether the asset is mintable through SCDP.
    bool isSCDPKrAsset;
    /// @notice Whether the asset is a collateral asset in SCDP.
    bool isSCDPCollateral;
    /// @notice Whether the asset is a deposit asset in SCDP.
    bool isSCDPDepositAsset;
}

struct RoleData {
    mapping(address => bool) members;
    bytes32 adminRole;
}

struct MaxLiqVars {
    Asset collateral;
    uint256 accountCollateralValue;
    uint256 minCollateralValue;
    uint256 seizeCollateralAccountValue;
    uint256 maxLiquidationRatio;
    uint128 minDebtValue;
    uint128 debtFactor;
}

struct PushPrice {
    uint256 price;
    uint256 timestamp;
}

/// @notice Configuration for pausing `Action`
struct Pause {
    bool enabled;
    uint256 timestamp0;
    uint256 timestamp1;
}

/// @notice Safety configuration for assets
struct SafetyState {
    Pause pause;
}

/**
 * @notice Initialization arguments for common values
 */
struct CommonInitArgs {
    address admin;
    address council;
    address treasury;
    uint128 minDebtValue;
    uint248 oracleDeviationPct;
    address sequencerUptimeFeed;
    uint48 sequencerGracePeriodTime;
    uint48 oracleTimeout;
    address kreskian;
    address questForKresk;
    uint8 extOracleDecimals;
    uint8 phase;
}

struct SCDPCollateralArgs {
    uint256 liquidityIndex; // no need to pack this, it's not used with depositLimit
    uint256 depositLimit;
    uint8 decimals;
}

struct SCDPKrAssetArgs {
    uint256 liquidationIncentive;
    uint256 supplyLimit;
    uint128 protocolFee; // Taken from the open+close fee. Goes to protocol.
    uint64 openFee;
    uint64 closeFee;
}

/* -------------------------------------------------------------------------- */
/*                                    ENUM                                    */
/* -------------------------------------------------------------------------- */

/**
 * @dev Protocol user facing actions
 *
 * Deposit = 0
 * Withdraw = 1,
 * Repay = 2,
 * Borrow = 3,
 * Liquidate = 4
 */
enum Action {
    Deposit,
    Withdraw,
    Repay,
    Borrow,
    Liquidation,
    SCDPDeposit,
    SCDPSwap,
    SCDPWithdraw,
    SCDPRepay,
    SCDPLiquidation
}

/**
 * @dev Fee types
 *
 * Open = 0
 * Close = 1
 */

enum Fee {
    Open,
    Close
}
