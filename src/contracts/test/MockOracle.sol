// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

contract MockOracle {
    uint256 public price;
    uint256 public decimals;

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        roundId = 0;
        answer = int256(price);
        startedAt = 0;
        updatedAt = 0;
        answeredInRound = 0;
    }

    constructor(uint256 _price, uint8 _decimals) {
        price = _price;
        decimals = _decimals;
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }
}
