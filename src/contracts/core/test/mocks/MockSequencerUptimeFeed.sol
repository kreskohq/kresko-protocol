// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

contract MockSequencerUptimeFeed {
    uint256 internal _startedAt = block.timestamp;

    function latestRoundData()
        public
        view
        virtual
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (0, 0, _startedAt, block.timestamp, 0);
    }
}