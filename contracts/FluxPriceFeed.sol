// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "./interfaces/AggregatorV2V3Interface.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @notice Simple data posting on chain of a scalar value, compatible with Chainlink V2 and V3 aggregator interface
 */
contract FluxPriceFeed is AccessControl, AggregatorV2V3Interface {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    uint32 public latestAggregatorRoundId;

    // Transmission records the answer from the transmit transaction at
    // time timestamp
    struct Transmission {
        int192 answer; // 192 bits ought to be enough for anyone
        uint64 timestamp;
    }
    mapping(uint32 => Transmission) /* aggregator round ID */
        internal s_transmissions;

    /**
     * @param _validator the initial validator that can post data to this contract
     * @param _decimals answers are stored in fixed-point format, with this many digits of precision
     * @param _description short human-readable description of observable this contract's answers pertain to
     */
    constructor(
        address _validator,
        uint8 _decimals,
        string memory _description
    ) {
        _setupRole(VALIDATOR_ROLE, _validator);
        decimals = _decimals;
        s_description = _description;
    }

    /*
     * Versioning
     */
    function typeAndVersion() external pure virtual returns (string memory) {
        return "FluxPriceFeed 1.0.0";
    }

    /*
     * Transmission logic
     */

    /**
     * @notice indicates that a new report was transmitted
     * @param aggregatorRoundId the round to which this report was assigned
     * @param answer value posted by validator
     * @param transmitter address from which the report was transmitted
     */
    event NewTransmission(uint32 indexed aggregatorRoundId, int192 answer, address transmitter);

    /**
     * @notice details about the most recent report
     * @return _latestAnswer value from latest report
     * @return _latestTimestamp when the latest report was transmitted
     */
    function latestTransmissionDetails() external view returns (int192 _latestAnswer, uint64 _latestTimestamp) {
        require(msg.sender == tx.origin, "Only callable by EOA");
        return (s_transmissions[latestAggregatorRoundId].answer, s_transmissions[latestAggregatorRoundId].timestamp);
    }

    /**
     * @notice transmit is called to post a new report to the contract
     * @param _answer latest answer
     */
    function transmit(int192 _answer) external {
        require(hasRole(VALIDATOR_ROLE, msg.sender), "Caller is not a validator");

        // Check the report contents, and record the result
        latestAggregatorRoundId++;
        s_transmissions[latestAggregatorRoundId] = Transmission(_answer, uint64(block.timestamp));

        emit NewTransmission(latestAggregatorRoundId, _answer, msg.sender);
    }

    /*
     * v2 Aggregator interface
     */

    /**
     * @notice answer from the most recent report
     */
    function latestAnswer() public view virtual override returns (int256) {
        return s_transmissions[latestAggregatorRoundId].answer;
    }

    /**
     * @notice timestamp of block in which last report was transmitted
     */
    function latestTimestamp() public view virtual override returns (uint256) {
        return s_transmissions[latestAggregatorRoundId].timestamp;
    }

    /**
     * @notice Aggregator round in which last report was transmitted
     */
    function latestRound() public view virtual override returns (uint256) {
        return latestAggregatorRoundId;
    }

    /**
     * @notice answer of report from given aggregator round
     * @param _roundId the aggregator round of the target report
     */
    function getAnswer(uint256 _roundId) public view virtual override returns (int256) {
        if (_roundId > 0xFFFFFFFF) {
            return 0;
        }
        return s_transmissions[uint32(_roundId)].answer;
    }

    /**
     * @notice timestamp of block in which report from given aggregator round was transmitted
     * @param _roundId aggregator round of target report
     */
    function getTimestamp(uint256 _roundId) public view virtual override returns (uint256) {
        if (_roundId > 0xFFFFFFFF) {
            return 0;
        }
        return s_transmissions[uint32(_roundId)].timestamp;
    }

    /*
     * v3 Aggregator interface
     */

    string private constant V3_NO_DATA_ERROR = "No data present";

    /**
     * @return answers are stored in fixed-point format, with this many digits of precision
     */
    uint8 public immutable override decimals;

    /**
     * @notice aggregator contract version
     */
    uint256 public constant override version = 1;

    string internal s_description;

    /**
     * @notice human-readable description of observable this contract is reporting on
     */
    function description() public view virtual override returns (string memory) {
        return s_description;
    }

    /**
     * @notice details for the given aggregator round
     * @param _roundId target aggregator round. Must fit in uint32
     * @return roundId _roundId
     * @return answer answer of report from given _roundId
     * @return startedAt timestamp of block in which report from given _roundId was transmitted
     * @return updatedAt timestamp of block in which report from given _roundId was transmitted
     * @return answeredInRound _roundId
     */
    function getRoundData(uint80 _roundId)
        public
        view
        virtual
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId <= 0xFFFFFFFF, V3_NO_DATA_ERROR);
        Transmission memory transmission = s_transmissions[uint32(_roundId)];
        return (_roundId, transmission.answer, transmission.timestamp, transmission.timestamp, _roundId);
    }

    /**
     * @notice aggregator details for the most recently transmitted report
     * @return roundId aggregator round of latest report
     * @return answer answer of latest report
     * @return startedAt timestamp of block containing latest report
     * @return updatedAt timestamp of block containing latest report
     * @return answeredInRound aggregator round of latest report
     */
    function latestRoundData()
        public
        view
        virtual
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = latestAggregatorRoundId;

        // Skipped for compatability with existing FluxAggregator in which latestRoundData never reverts.
        // require(roundId != 0, V3_NO_DATA_ERROR);

        Transmission memory transmission = s_transmissions[uint32(roundId)];
        return (roundId, transmission.answer, transmission.timestamp, transmission.timestamp, roundId);
    }
}
