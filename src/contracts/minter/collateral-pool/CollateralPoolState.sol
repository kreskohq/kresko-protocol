// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {LibCollateralPool} from "./libs/LibCollateralPool.sol";

/* solhint-disable var-name-mixedcase */

using LibCollateralPool for CollateralPoolState global;

struct PoolCollateral {
    uint256 liquidationIncentive;
    uint128 liquidityIndex;
    uint8 decimals;
}

struct PoolKreskoAsset {
    uint256 swapFee;
    uint256 openFee;
    uint256 closeFee;
    uint256 supplyLimit;
}

// Storage layout
struct CollateralPoolState {
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minimumCollateralizationRatio;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
    /// @notice Mapping of krAsset -> debt amount the shared pool owes
    mapping(address => uint256) kreskoAssetDebt;
    /// @notice Mapping of collateral -> deposit amount for the shared pool
    mapping(address => uint256) collateralDeposits;
    /// @notice Mapping of account -> collateral -> scaled collateral amount in the shared pool
    mapping(address => mapping(address => uint256)) collateralDepositsAccount;
    /// @notice Mapping of collateral -> PoolCollateral
    mapping(address => PoolCollateral) poolCollateral;
    /// @notice Mapping of krAsset -> PoolKreskoAsset
    mapping(address => PoolKreskoAsset) poolKreskoAsset;
    /// @notice Array of collateral assets that can be deposited
    address[] enabledCollaterals;
    /// @notice Array of kresko assets that can be minted
    address[] enabledKreskoAssets;
    /// @notice Swap fee receiver
    address feeReceiver;
}

// Storage position
bytes32 constant COLLATEREAL_POOL_STORAGE_POSITION = keccak256("kresko.collateral.pool.storage");

// solhint-disable func-visibility
function cps() pure returns (CollateralPoolState storage state) {
    bytes32 position = COLLATEREAL_POOL_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
