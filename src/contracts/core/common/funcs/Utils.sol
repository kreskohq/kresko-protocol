// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {ms} from "minter/State.sol";

/**
 * @notice checks if the sequencer is up.
 * @return bool returns true/false if the sequencer is up/not.
 */
function isSequencerUp() view returns (bool) {
    if (ms().sequencerUptimeFeed != address(0)) {
        (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(ms().sequencerUptimeFeed).latestRoundData();
        if (answer == 0) {
            return false;
        }
        // Make sure the grace period has passed after the
        // sequencer is back up.
        uint256 timeSinceUp = block.timestamp - startedAt;
        if (timeSinceUp <= ms().sequencerGracePeriodTime) {
            return false;
        }
    }
    return true;
}
