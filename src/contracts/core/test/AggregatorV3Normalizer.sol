// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";

// solhint-disable const-name-snakecase

/**
 * @title AggregatorV3Normalizer
 * @notice Wraps an AggregatorV3 feed and normalizes the answer to 8 decimal precision.
 */
contract AggregatorV3Normalizer is IAggregatorV3 {
    uint8 public constant decimals = 8;
    uint256 public immutable version;

    string public description;
    IAggregatorV3 public immutable feed;
    uint8 public immutable feedDecimals;

    constructor(address _feed) {
        feed = IAggregatorV3(_feed);
        description = feed.description();
        version = feed.version();
        feedDecimals = feed.decimals();
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        return (roundId, normalized(answer, feedDecimals), startedAt, updatedAt, answeredInRound);
    }

    function getRoundData(uint80 _roundId) external view returns (uint80, int256, uint256, uint256, uint80) {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = feed.getRoundData(
            _roundId
        );
        return (roundId, normalized(answer, feedDecimals), startedAt, updatedAt, answeredInRound);
    }

    function normalized(int256 price, uint256 sourceDecimals) public pure returns (int256) {
        if (sourceDecimals > decimals) {
            return price / int256(10 ** (sourceDecimals - decimals));
        } else if (sourceDecimals < decimals) {
            return price * int256(10 ** (decimals - sourceDecimals));
        } else {
            return price;
        }
    }
}
