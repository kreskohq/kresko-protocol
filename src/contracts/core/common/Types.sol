// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {CollateralAsset} from "minter/Types.sol";

/* -------------------------------------------------------------------------- */
/*                               Access Control                               */
/* -------------------------------------------------------------------------- */
struct RoleData {
    mapping(address => bool) members;
    bytes32 adminRole;
}

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

struct MaxLiqVars {
    CollateralAsset collateral;
    uint256 accountCollateralValue;
    uint256 minCollateralValue;
    uint256 seizeCollateralAccountValue;
    uint256 maxLiquidationMultiplier;
    uint256 minDebtValue;
    uint256 liquidationThreshold;
    uint256 debtFactor;
}

struct PushPrice {
    uint256 price;
    uint256 timestamp;
}
