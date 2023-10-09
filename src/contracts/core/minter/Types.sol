// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */
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
}

/**
 * @notice Configurable parameters within the protocol
 */

struct MinterParams {
    uint32 minCollateralRatio;
    uint32 liquidationThreshold;
    uint32 maxLiquidationRatio;
}

/**
 * @dev Fee types
 *
 * Open = 0
 * Close = 1
 */
enum MinterFee {
    Open,
    Close
}
