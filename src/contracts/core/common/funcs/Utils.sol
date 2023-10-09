// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {cs} from "common/State.sol";

/**
 * @notice Checks if the L2 sequencer is up.
 * 1 means the sequencer is down, 0 means the sequencer is up.
 * @return bool returns true/false if the sequencer is up/not.
 */
function isSequencerUp() view returns (bool) {
    bool up = true;
    if (cs().sequencerUptimeFeed != address(0)) {
        (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(cs().sequencerUptimeFeed).latestRoundData();

        up = answer == 0;
        if (!up) {
            return false;
        }
        // Make sure the grace period has passed after the
        // sequencer is back up.
        if (block.timestamp - startedAt < cs().sequencerGracePeriodTime) {
            return false;
        }
    }
    return up;
}
