// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/AggregatorV2V3Interface.sol";
import "../libraries/Median.sol";

/**
 * @title Flux first-party price feed oracle aggregator
 * @author fluxprotocol.org
 * @notice Aggregates from multiple first-party price oracles (FluxPriceFeed.sol), compatible with
 *     Chainlink V2 and V3 aggregator interface
 */
contract FluxPriceAggregator is AccessControl, AggregatorV2V3Interface, Pausable {
    using Median for uint256[];

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint32 public latestAggregatorRoundId;

    // Transmission records the answer from the transmit transaction at
    // time timestamp
    struct Transmission {
        int192 answer; // 192 bits ought to be enough for anyone
        uint64 timestamp;
        bool marketOpen;
    }
    mapping(uint32 => Transmission) /* aggregator round ID */
        internal transmissions;

    uint256 public minDelay = 1 minutes;
    address[] public oracles;

    /**
     * @dev Initialize oracles and fetch initial prices
     * @param _admin the initial admin that can aggregate data from and set the oracles
     * @param _oracles the oracles to aggregate data from
     * @param _decimals answers are stored in fixed-point format, with this many digits of precision
     * @param __description short human-readable description of observable this contract's answers pertain to
     */

    constructor(
        address _admin,
        address[] memory _oracles,
        uint8 _decimals,
        string memory __description
    ) {
        _setupRole(ADMIN_ROLE, _admin);
        oracles = _oracles;
        decimals = _decimals;
        _description = __description;
    }

    /*
     * Versioning
     */
    function typeAndVersion() external pure virtual returns (string memory) {
        return "FluxPriceAggregator 1.0.0";
    }

    /*
     * Publicly-callable mutative functions
     */

    /// @notice Update prices, callable by anyone
    function updatePrices() public whenNotPaused {
        // Require min delay since lastUpdate
        require(block.timestamp > transmissions[latestAggregatorRoundId].timestamp + minDelay);

        // Fetch median of latest answers from oracles and determine market open/closed by majority vote
        uint256[] memory latestAnswers = new uint256[](oracles.length);
        uint256 invalidAnswerCount;
        int marketOpenCount;
        int marketClosedCount;
        for (uint256 i = 0; i < oracles.length; i++) {
            AggregatorV2V3Interface oracle = AggregatorV2V3Interface(oracles[i]);
            // Drop unintialized values as oracle has never posted
            uint256 latestTime = oracle.latestTimestamp();
            if(latestTime == 0) {
                invalidAnswerCount++;
                continue;
            }
            // Drop negative values as assets cannot have negative prices
            int256 latestAns = oracle.latestAnswer();
            if(latestAns < 0) {
                invalidAnswerCount++;
                continue;
            }
            latestAnswers[i-invalidAnswerCount] = uint256(latestAns);
            // Increment market open/closed counters
            bool isMarketOpen = oracle.latestMarketOpen();
            isMarketOpen ? marketOpenCount++ : marketClosedCount++;
        }

        // Clean up latest answers array, keeping only valid prices
        uint256[] memory trimmedLatestAnswers = new uint[](latestAnswers.length-invalidAnswerCount);
        for (uint j = 0; j < trimmedLatestAnswers.length; j++) {
            trimmedLatestAnswers[j] = latestAnswers[j];
        }

        // Calculate median answer and market open/close
        uint256 medianAnswer = trimmedLatestAnswers.median(trimmedLatestAnswers.length);
        int192 _answer = int192(int256(medianAnswer));
        bool marketOpen = marketOpenCount > marketClosedCount ? true : false;

        // Update round
        latestAggregatorRoundId++;
        transmissions[latestAggregatorRoundId] = Transmission(_answer, uint64(block.timestamp), marketOpen);

        emit AnswerUpdated(_answer, marketOpen, latestAggregatorRoundId, block.timestamp);
    }

    /*
     * Admin-only functions
     */

    /// @notice Changes min delay, only callable by admin
    function setDelay(uint256 _minDelay) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        minDelay = _minDelay;
    }

    /// @notice Changes oracles, only callable by admin
    function setOracles(address[] memory _oracles) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        oracles = _oracles;
    }

    /// @notice Pauses or unpauses updating the price, only callable by admin
    function pause(bool __pause) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        if (__pause) {
            _pause();
        } else {
            _unpause();
        }
    }

    /// @notice Overrides the price, only callable by admin
    function setManualAnswer(int192 _answer, bool _marketOpen) public {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        latestAggregatorRoundId++;
        transmissions[latestAggregatorRoundId] = Transmission(_answer, uint64(block.timestamp), _marketOpen);
        emit AnswerUpdated(_answer, _marketOpen, latestAggregatorRoundId, block.timestamp);
    }

    /*
     * v2 Aggregator interface
     */

    /**
     * @notice answer from the most recent report
     */
    function latestAnswer() public view virtual override returns (int256) {
        return transmissions[latestAggregatorRoundId].answer;
    }

    /**
     * @notice timestamp of block in which last report was transmitted
     */
    function latestTimestamp() public view virtual override returns (uint256) {
        return transmissions[latestAggregatorRoundId].timestamp;
    }

    /**
     * @notice market open indicator from the most recent report
     */
    function latestMarketOpen() public view virtual override returns (bool) {
        return transmissions[latestAggregatorRoundId].marketOpen;
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
        return transmissions[uint32(_roundId)].answer;
    }

    /**
     * @notice timestamp of block in which report from given aggregator round was transmitted
     * @param _roundId aggregator round of target report
     */
    function getTimestamp(uint256 _roundId) public view virtual override returns (uint256) {
        if (_roundId > 0xFFFFFFFF) {
            return 0;
        }
        return transmissions[uint32(_roundId)].timestamp;
    }

    /**
     * @notice market open of report from given aggregator round
     * @param _roundId the aggregator round of the target report
     */
    function getMarketOpen(uint256 _roundId) public view virtual override returns (bool) {
        require(_roundId <= 0xFFFFFFFF, "FluxPriceFeed: round ID");
        return transmissions[uint32(_roundId)].marketOpen;
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

    string internal _description;

    /**
     * @notice human-readable description of observable this contract is reporting on
     */
    function description() public view virtual override returns (string memory) {
        return _description;
    }

    /**
     * @notice details for the given aggregator round
     * @param _roundId target aggregator round. Must fit in uint32
     * @return roundId _roundId
     * @return answer answer of report from given _roundId
     * @return marketOpen of report from given _roundId
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
            bool marketOpen,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId <= 0xFFFFFFFF, V3_NO_DATA_ERROR);
        Transmission memory transmission = transmissions[uint32(_roundId)];
        return (_roundId, transmission.answer, transmission.marketOpen, transmission.timestamp, transmission.timestamp, _roundId);
    }

    /**
     * @notice aggregator details for the most recently transmitted report
     * @return roundId aggregator round of latest report
     * @return answer answer of latest report
     * @return marketOpen of report from latest report
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
            bool marketOpen,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = latestAggregatorRoundId;

        // Skipped for compatability with existing FluxAggregator in which latestRoundData never reverts.
        // require(roundId != 0, V3_NO_DATA_ERROR);

        Transmission memory transmission = transmissions[uint32(roundId)];
        return (roundId, transmission.answer, transmission.marketOpen, transmission.timestamp, transmission.timestamp, roundId);
    }
}
