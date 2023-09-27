// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

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
