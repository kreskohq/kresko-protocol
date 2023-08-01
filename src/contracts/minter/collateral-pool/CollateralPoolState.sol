// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {LibCollateralPool} from "./libs/LibCollateralPool.sol";
import {LibSwap} from "./libs/LibSwap.sol";
import {LibAmounts} from "./libs/LibAmounts.sol";
import {IPositionsFacet} from "./position/interfaces/IPositionsFacet.sol";

/* solhint-disable var-name-mixedcase */

using LibCollateralPool for CollateralPoolState global;
using LibAmounts for CollateralPoolState global;
using LibSwap for CollateralPoolState global;

struct PoolCollateral {
    uint256 liquidationIncentive;
    uint128 liquidityIndex;
    uint256 depositLimit;
    uint8 decimals;
}

struct PoolKrAsset {
    uint256 protocolFee; // Taken from the open/close fee. Goes to protocol.
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
    /// @notice Mapping of krAsset -> pooled debt
    mapping(address => uint256) debt;
    /// @notice Mapping of collateral -> pooled deposits
    mapping(address => uint256) totalDeposits;
    /// @notice Mapping of asset -> swap owned collateral deposits
    mapping(address => uint256) swapDeposits;
    /// @notice Mapping of account -> collateral -> collateral deposits.
    mapping(address => mapping(address => uint256)) deposits;
    /// @notice Mapping of account -> collateral -> principal collateral deposits.
    mapping(address => mapping(address => uint256)) depositsPrincipal;
    /// @notice Mapping of collateral -> PoolCollateral
    mapping(address => PoolCollateral) poolCollateral;
    /// @notice Mapping of krAsset -> PoolKreskoAsset
    mapping(address => PoolKrAsset) poolKrAsset;
    /// @notice Mapping of asset -> asset -> swap enabled
    mapping(address => mapping(address => bool)) isSwapEnabled;
    /// @notice Mapping of asset -> enabled
    mapping(address => bool) isEnabled;
    /// @notice Array of collateral assets that can be deposited
    address[] collaterals;
    /// @notice Array of kresko assets that can be minted and swapped.
    address[] krAssets;
    /// @notice User swap fee receiver
    address swapFeeRecipient;
    /// @notice Positions NFT
    IPositionsFacet positions;
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
