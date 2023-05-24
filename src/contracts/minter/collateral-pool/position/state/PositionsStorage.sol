// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {LibPositions} from "../libs/LibPositions.sol";
import {ICollateralPoolSwapFacet} from "../../interfaces/ICollateralPoolSwapFacet.sol";

struct NewPosition {
    address account;
    address assetA;
    address assetB;
    uint256 amountA;
    uint256 amountBMin;
    uint256 leverage;
}

struct Position {
    address account;
    address assetA;
    address assetB;
    uint256 amountA;
    uint256 amountB;
    uint256 valueBCache;
    uint256 leverage;
    uint256 liquidationIncentive;
    uint256 closeIncentive;
    uint256 creationTimestamp;
    uint256 lastUpdateTimestamp;
    uint256 nonce;
}

struct PositionsInitializer {
    ICollateralPoolSwapFacet kresko;
    string name;
    string symbol;
    int128 liquidationThreshold;
    int128 closeThreshold;
    uint256 maxLeverage;
    uint256 minLeverage;
}

struct PositionStorage {
    ICollateralPoolSwapFacet kresko;
    uint256 minLeverage;
    uint256 maxLeverage;
    int128 liquidationThreshold;
    int128 closeThreshold;
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
