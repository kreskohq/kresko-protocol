// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {CAsset} from "common/funcs/Asset.sol";

using CAsset for Asset global;

/* -------------------------------------------------------------------------- */
/*                               Access Control                               */
/* -------------------------------------------------------------------------- */

library Role {
    /// @dev Meta role for all roles.
    bytes32 internal constant DEFAULT_ADMIN = 0x00;
    /// @dev keccak256("kresko.roles.minter.admin")
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

/// @dev Set the initial value to 1, (not hindering possible gas refunds by setting it to 0 on exit).
uint8 constant NOT_ENTERED = 1;
uint8 constant ENTERED = 2;

/* ========================================================================== */
/*                                   Structs                                  */
/* ========================================================================== */

/// @notice Oracle configuration mapped to `Asset.underlyingId`.
struct Oracle {
    address feed;
    function(address) external view returns (uint256) priceGetter;
}

/// @notice Supported oracle providers.
enum OracleType {
    Redstone,
    Chainlink,
    API3
}

/**
 * @notice Feed configuration.
 * @param oracleIds List of two supported oracle providers.
 * @param feeds List of two feed addresses matching to the providers supplied. Redstone will be address(0).
 */
struct FeedConfiguration {
    OracleType[2] oracleIds;
    address[2] feeds;
}

/**
 * @title Protocol Asset Configuration
 * @author Kresko
 * @notice All assets in the protocol share this configuration.
 * @notice underlyingId is not unique, eg. krETH and WETH both would use bytes12('ETH')
 * @dev Percentages use 2 decimals: 1e4 (10000) == 100.00%. See {PercentageMath.sol}.
 * @dev Note that the percentage value for uint16 caps at 655.36%.
 */
struct Asset {
    /// @notice Bytes identifier for the underlying, not unique, matches Redstone IDs. eg. bytes12('ETH').
    /// @notice Packed to 12, so maximum 12 chars.
    bytes12 underlyingId;
    /// @notice Kresko Asset Anchor address.
    address anchor;
    /// @notice Oracle provider priority for this asset.
    /// @notice Provider at index 0 is the primary price source.
    /// @notice Provider at index 1 is the reference price for deviation check and also the fallback price.
    OracleType[2] oracles;
    /// @notice Percentage multiplier which decreases collateral asset valuation (if < 100%), mitigating price risk.
    /// @notice Always <= 100% or 1e4.
    uint16 factor;
    /// @notice Percentage multiplier which increases debt asset valution (if > 100%), mitigating price risk.
    /// @notice Always >= 100% or 1e4.
    uint16 kFactor;
    /// @notice Minter fee percent for opening a debt position. <= 25%.
    /// @notice Fee is deducted from collaterals.
    uint16 openFee;
    /// @notice Minter fee percent for closing a debt position. <= 25%.
    /// @notice Fee is deducted from collaterals.
    uint16 closeFee;
    /// @notice Minter liquidation incentive when asset is the seized collateral in a liquidation.
    uint16 liqIncentive;
    /// @notice Supply limit for Kresko Assets.
    /// @dev NOTE: uint128
    uint128 supplyLimit;
    /// @notice SCDP deposit limit for the asset.
    /// @dev NOTE: uint128.
    uint128 depositLimitSCDP;
    /// @notice SCDP liquidity index (RAY precision). Scales the deposits globally:
    /// @notice 1) Increased from fees accrued into deposits.
    /// @notice 2) Decreased from liquidations where swap collateral does not cover value required.
    /// @dev NOTE: uint128
    uint128 liquidityIndexSCDP;
    /// @notice SCDP fee percent when swapped as "asset in". Cap 25% == a.inFee + b.outFee <= 50%.
    uint16 swapInFeeSCDP;
    /// @notice SCDP fee percent when swapped as "asset out". Cap 25% == a.outFee + b.inFee <= 50%.
    uint16 swapOutFeeSCDP;
    /// @notice SCDP protocol cut of the swap fees. Cap 50% == a.feeShare + b.feeShare <= 100%.
    uint16 protocolFeeShareSCDP;
    /// @notice SCDP liquidation incentive, defined for Kresko Assets.
    /// @notice Applied as discount for seized collateral when the KrAsset is repaid in a liquidation.
    uint16 liqIncentiveSCDP;
    /// @notice ERC20 decimals of the asset, queried and saved once during setup.
    /// @notice Kresko Assets have 18 decimals.
    uint8 decimals;
    /// @notice Asset can be deposited as collateral in the Minter.
    bool isCollateral;
    /// @notice Asset can be minted as debt from the Minter.
    bool isKrAsset;
    /// @notice Asset can be deposited as collateral in the SCDP.
    bool isSCDPDepositAsset;
    /// @notice Asset can be minted through swaps in the SCDP.
    bool isSCDPKrAsset;
    /// @notice Asset is included in the total collateral value calculation for the SCDP.
    /// @notice KrAssets will be true by default - since they are indirectly deposited through swaps.
    bool isSCDPCollateral;
    /// @notice Asset can be used to cover SCDP debt.
    bool isSCDPCoverAsset;
}

/// @notice The access control role data.
struct RoleData {
    mapping(address => bool) members;
    bytes32 adminRole;
}

/// @notice Variables used for calculating the max liquidation value.
struct MaxLiqVars {
    Asset collateral;
    uint256 accountCollateralValue;
    uint256 minCollateralValue;
    uint256 seizeCollateralAccountValue;
    uint192 minDebtValue;
    uint32 gainFactor;
    uint32 maxLiquidationRatio;
    uint32 debtFactor;
}

struct MaxLiqInfo {
    address account;
    address seizeAssetAddr;
    address repayAssetAddr;
    uint256 repayValue;
    uint256 repayAmount;
    uint256 seizeAmount;
    uint256 seizeValue;
    uint256 repayAssetPrice;
    uint256 repayAssetIndex;
    uint256 seizeAssetPrice;
    uint256 seizeAssetIndex;
}

/// @notice Convenience struct for returning push price data
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
    uint64 minDebtValue;
    uint16 oracleDeviationPct;
    uint8 oracleDecimals;
    address sequencerUptimeFeed;
    uint24 sequencerGracePeriodTime;
    uint32 oracleTimeout;
    address kreskian;
    address questForKresk;
    uint8 phase;
}

struct SCDPCollateralArgs {
    uint128 liquidityIndex; // no need to pack this, it's not used with depositLimit
    uint128 depositLimit;
    uint8 decimals;
}

struct SCDPKrAssetArgs {
    uint128 supplyLimit;
    uint16 liqIncentive;
    uint16 protocolFee; // Taken from the open+close fee. Goes to protocol.
    uint16 openFee;
    uint16 closeFee;
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
