// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Asset} from "common/Types.sol";
/**
 * @notice SCDP initializer configuration.
 * @param swapFeeRecipient The swap fee recipient.
 * @param minCollateralRatio The minimum collateralization ratio.
 * @param liquidationThreshold The liquidation threshold.
 */
struct SCDPInitArgs {
    address swapFeeRecipient;
    uint32 minCollateralRatio;
    uint32 liquidationThreshold;
}

// Used for setting swap pairs enabled or disabled in the pool.
struct PairSetter {
    address assetIn;
    address assetOut;
    bool enabled;
}

struct SCDPAssetData {
    uint256 debt;
    uint128 totalDeposits;
    uint128 swapDeposits;
}

// give me 256 bits in three
// 128 + 128 = 256

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
    uint256 scaledDepositAmount;
    uint256 depositValue;
    uint256 scaledDepositValue;
}

struct UserData {
    address account;
    uint256 totalDepositValue;
    uint256 totalScaledDepositValue;
    uint256 totalFeesValue;
    UserAssetData[] deposits;
}
