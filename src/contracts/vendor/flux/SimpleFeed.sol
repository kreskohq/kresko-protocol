pragma solidity >=0.8.20;
import {AggregatorV3Interface} from "../AggregatorV3Interface.sol";

contract SimpleFeed is AggregatorV3Interface {

    uint8 public override decimals = 8;
    string public override description;
    uint256 public override version = 1;
    int256 public  initialAnswer;

    constructor(string memory _description, int256 _initialAnswer) {
        description = _description;
        initialAnswer = _initialAnswer;
    }
    
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, initialAnswer,  block.timestamp, block.timestamp, roundId);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, initialAnswer, block.timestamp, block.timestamp, roundId);
    }
}