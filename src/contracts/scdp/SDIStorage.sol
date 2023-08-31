// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {LibSDI} from "./libs/LibSDI.sol";

using LibSDI for SDIState global;

/**
 * @notice Asset struct for cover assets
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param enabled Enabled status of the asset
 */
struct Asset {
    AggregatorV3Interface oracle;
    bytes32 redstoneId;
    bool enabled;
    uint8 decimals;
}

struct SDIState {
    uint256 totalDebt;
    uint256 totalCover;
    address coverRecipient;
    mapping(address => Asset) coverAssets;
    address[] coverAssetList;
}

// Storage position
bytes32 constant SDI_STORAGE_POSITION = keccak256("kresko.sdi.storage");

// solhint-disable func-visibility
function sdi() pure returns (SDIState storage state) {
    bytes32 position = SDI_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}
