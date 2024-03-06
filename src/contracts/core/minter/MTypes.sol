// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */
/**
 * @notice Internal, used execute _liquidateAssets.
 * @param account The account being liquidated.
 * @param repayAmount Amount of the Kresko Assets repaid.
 * @param seizeAmount Calculated amount of collateral being seized.
 * @param repayAsset Address of the Kresko asset being repaid.
 * @param repayIndex Index of the Kresko asset in the accounts minted assets array.
 * @param seizeAsset Address of the collateral asset being seized.
 * @param seizeAssetIndex Index of the collateral asset in the account's collateral assets array.
 */
struct LiquidateExecution {
    address account;
    uint256 repayAmount;
    uint256 seizeAmount;
    address repayAssetAddr;
    uint256 repayAssetIndex;
    address seizedAssetAddr;
    uint256 seizedAssetIndex;
}

struct MinterAccountState {
    uint256 totalDebtValue;
    uint256 totalCollateralValue;
    uint256 collateralRatio;
}
/**
 * @notice Initialization arguments for the protocol
 */
struct MinterInitArgs {
    uint32 liquidationThreshold;
    uint32 minCollateralRatio;
    uint256 minDebtValue;
}

/**
 * @notice Configurable parameters within the protocol
 */

struct MinterParams {
    uint32 minCollateralRatio;
    uint32 liquidationThreshold;
    uint32 maxLiquidationRatio;
    uint256 minDebtValue;
}
