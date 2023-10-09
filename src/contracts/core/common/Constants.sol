// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

bytes12 constant EMPTY_BYTES12 = bytes12("");

/* -------------------------------------------------------------------------- */
/*                                 Reentrancy                                 */
/* -------------------------------------------------------------------------- */

/// @dev Set the initial value to 1, (not hindering possible gas refunds by setting it to 0 on exit).
uint8 constant NOT_ENTERED = 1;
uint8 constant ENTERED = 2;

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
/*                                    MISC                                    */
/* -------------------------------------------------------------------------- */

library Constants {
    /// @dev The minimum collateral amount for a kresko asset.
    uint256 internal constant MIN_KRASSET_COLLATERAL_AMOUNT = 1e12;

    /// @dev The maximum configurable minimum debt USD value. 8 decimals.
    uint256 internal constant MAX_MIN_DEBT_VALUE = 1_000 * 1e8; // $1,000
}

library Percents {
    uint16 internal constant ONE = 0.01e4;
    uint16 internal constant HUNDRED = 1e4;
    uint16 internal constant TWENTY_FIVE = 0.25e4;
    uint16 internal constant FIFTY = 0.50e4;

    uint16 internal constant BASIS_POINT = 1;
    /// @dev The maximum configurable close fee.
    uint16 internal constant MAX_CLOSE_FEE = 0.25e4; // 25%

    /// @dev The maximum configurable open fee.
    uint16 internal constant MAX_OPEN_FEE = 0.25e4; // 25%

    /// @dev The maximum configurable protocol fee per asset for collateral pool swaps.
    uint16 internal constant MAX_SCDP_FEE = 0.5e4; // 50%

    /// @dev The minimum configurable minimum collateralization ratio.
    uint16 internal constant MIN_CR = HUNDRED + ONE; // 101%

    /// @dev The minimum configurable liquidation incentive multiplier.
    /// This means liquidator only receives equal amount of collateral to debt repaid.
    uint16 internal constant MIN_LIQ_INCENTIVE = HUNDRED;

    /// @dev The maximum configurable liquidation incentive multiplier.
    /// This means liquidator receives 25% bonus collateral compared to the debt repaid.
    uint16 internal constant MAX_LIQ_INCENTIVE = 1.25e4; // 125%
}
