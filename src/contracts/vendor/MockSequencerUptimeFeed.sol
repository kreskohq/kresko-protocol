// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

contract MockSequencerUptimeFeed {
    function latestRoundData()
        public
        view
        virtual
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (0, 0, block.timestamp, block.timestamp, 0);
    }
}
