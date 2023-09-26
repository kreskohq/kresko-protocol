// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {cs} from "common/State.sol";

/**
 * @notice checks if the sequencer is up.
 * @return bool returns true/false if the sequencer is up/not.
 */
function isSequencerUp() view returns (bool) {
    if (cs().sequencerUptimeFeed != address(0)) {
        (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(cs().sequencerUptimeFeed).latestRoundData();
        if (answer == 0) {
            return false;
        }
        // Make sure the grace period has passed after the
        // sequencer is back up.
        uint256 timeSinceUp = block.timestamp - startedAt;
        if (timeSinceUp <= cs().sequencerGracePeriodTime) {
            return false;
        }
    }
    return true;
}
