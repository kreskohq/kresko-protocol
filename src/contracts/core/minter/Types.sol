// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

/**
 * @notice Initialization arguments for the protocol
 */
struct MinterInitArgs {
    uint256 liquidationThreshold;
    uint256 minCollateralRatio;
}

/**
 * @notice Configurable parameters within the protocol
 */

struct MinterParams {
    uint256 minCollateralRatio;
    uint256 liquidationThreshold;
    uint256 maxLiquidationRatio;
}
