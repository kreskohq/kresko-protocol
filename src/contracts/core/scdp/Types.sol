// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Asset} from "common/Types.sol";
import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
/**
 * @notice SCDP initializer configuration.
 * @param _swapFeeRecipient The swap fee recipient.
 * @param _mcr The minimum collateralization ratio.
 * @param _lt The liquidation threshold.
 */
struct SCDPInitArgs {
    address swapFeeRecipient;
    uint256 mcr;
    uint256 lt;
}

// Used for setting swap pairs enabled or disabled in the pool.
struct PairSetter {
    address assetIn;
    address assetOut;
    bool enabled;
}

struct SharedDeposits {
    uint128 totalDeposits;
    uint128 swapDeposits;
}

/**
 * @notice Asset struct for cover assets
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param enabled Enabled status of the asset
 */

struct CoverAsset {
    AggregatorV3Interface oracle;
    bytes32 redstoneId;
    bool enabled;
    uint8 decimals;
}

struct GlobalData {
    uint256 collateralValue;
    uint256 collateralValueAdjusted;
    uint256 debtValue;
    uint256 debtValueAdjusted;
    uint256 effectiveDebtValue;
    uint256 cr;
    uint256 crDebtValue;
    uint256 crDebtValueAdjusted;
}

/**
 * Periphery asset data
 */
struct AssetData {
    address addr;
    uint256 depositAmount;
    uint256 depositValue;
    uint256 depositValueAdjusted;
    uint256 debtAmount;
    uint256 debtValue;
    uint256 debtValueAdjusted;
    uint256 swapDeposits;
    Asset asset;
    uint256 assetPrice;
    string symbol;
}

struct UserAssetData {
    address asset;
    uint256 assetPrice;
    uint256 depositAmount;
    uint256 depositAmountWithFees;
    uint256 depositValue;
    uint256 depositValueWithFees;
}

struct UserData {
    address account;
    uint256 totalDepositValue;
    uint256 totalDepositValueWithFees;
    uint256 totalFeesValue;
    UserAssetData[] deposits;
}
