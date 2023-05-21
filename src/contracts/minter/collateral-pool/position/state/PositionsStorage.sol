// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;

import {LibPositions} from "../libs/LibPositions.sol";
import {ICollateralPoolSwapFacet} from "../../interfaces/ICollateralPoolSwapFacet.sol";

struct NewPosition {
    address account;
    address collateralAsset;
    address borrowAsset;
    uint256 collateralAmount;
    uint256 borrowAmount;
    uint256 borrowAmountMin;
    uint256 leverage;
}

struct Position {
    address account;
    address collateral;
    address borrowed;
    uint256 collateralAmount;
    uint256 borrowedAmount;
    uint256 leverage;
    uint256 creationTimestamp;
    uint256 lastUpdateTimestamp;
}
struct PositionStorage {
    ICollateralPoolSwapFacet kresko;
    uint256 minLeverage;
    uint256 maxLeverage;
    uint256 liquidationThreshold;
    mapping(uint256 => Position) positions;
}

using LibPositions for PositionStorage global;

// Storage position
bytes32 constant POSITIONS_STORAGE = keccak256("kresko.positions.positions.storage");

function pos() pure returns (PositionStorage storage state) {
    bytes32 position = POSITIONS_STORAGE;
    assembly {
        state.slot := position
    }
}
