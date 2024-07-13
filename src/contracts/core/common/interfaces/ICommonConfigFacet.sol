// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {FeedConfiguration} from "common/Types.sol";

interface ICommonConfigFacet {
    struct PythConfig {
        bytes32[] pythIds;
        uint256[] staleTimes;
        bool[] invertPyth;
        bool[] isClosables;
    }

    /**
     * @notice Updates the fee recipient.
     * @param _newFeeRecipient The new fee recipient.
     */
    function setFeeRecipient(address _newFeeRecipient) external;

    function setPythEndpoint(address _pythEp) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _decimals Amount of decimals
     */
    function setDefaultOraclePrecision(uint8 _decimals) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _oracleDeviationPct Amount of decimals
     */
    function setMaxPriceDeviationPct(uint16 _oracleDeviationPct) external;

    /**
     * @notice Sets L2 sequencer uptime feed address
     * @param _sequencerUptimeFeed sequencer uptime feed address
     */
    function setSequencerUptimeFeed(address _sequencerUptimeFeed) external;

    /**
     * @notice Sets sequencer grace period time
     * @param _sequencerGracePeriodTime grace period time
     */
    function setSequencerGracePeriod(uint32 _sequencerGracePeriodTime) external;

    /**
     * @notice Set feeds for a ticker.
     * @param _ticker Ticker in bytes32 eg. bytes32("ETH")
     * @param _feedConfig List oracle configuration containing oracle identifiers and feed addresses.
     */
    function setFeedsForTicker(bytes32 _ticker, FeedConfiguration memory _feedConfig) external;

    /**
     * @notice Set chainlink feeds for tickers.
     * @dev Has modifiers: onlyRole.
     * @param _tickers Bytes32 list of tickers
     * @param _feeds List of feed addresses.
     */
    function setChainlinkFeeds(
        bytes32[] calldata _tickers,
        address[] calldata _feeds,
        uint256[] memory _staleTimes,
        bool[] calldata _isClosables
    ) external;

    /**
     * @notice Set api3 feeds for tickers.
     * @dev Has modifiers: onlyRole.
     * @param _tickers Bytes32 list of tickers
     * @param _feeds List of feed addresses.
     */
    function setAPI3Feeds(
        bytes32[] calldata _tickers,
        address[] calldata _feeds,
        uint256[] memory _staleTimes,
        bool[] calldata _isClosables
    ) external;

    /**
     * @notice Set a vault feed for ticker.
     * @dev Has modifiers: onlyRole.
     * @param _ticker Ticker in bytes32 eg. bytes32("ETH")
     * @param _vaultAddr Vault address
     * @custom:signature setVaultFeed(bytes32,address)
     * @custom:selector 0xc3f9c901
     */
    function setVaultFeed(bytes32 _ticker, address _vaultAddr) external;

    /**
     * @notice Set a pyth feeds for tickers.
     * @dev Has modifiers: onlyRole.
     * @param _tickers Bytes32 list of tickers
     * @param pythConfig Pyth configuration
     */
    function setPythFeeds(bytes32[] calldata _tickers, PythConfig calldata pythConfig) external;

    function setPythFeed(bytes32 _ticker, bytes32 _pythId, bool _invert, uint256 _staleTime, bool _isClosable) external;

    /**
     * @notice Set ChainLink feed address for ticker.
     * @param _ticker Ticker in bytes32 eg. bytes32("ETH")
     * @param _feedAddr The feed address.
     * @custom:signature setChainLinkFeed(bytes32,address)
     * @custom:selector 0xe091f77a
     */
    function setChainLinkFeed(bytes32 _ticker, address _feedAddr, uint256 _staleTime, bool _isClosable) external;

    /**
     * @notice Set API3 feed address for an asset.
     * @param _ticker Ticker in bytes32 eg. bytes32("ETH")
     * @param _feedAddr The feed address.
     * @custom:signature setApi3Feed(bytes32,address)
     * @custom:selector 0x7e9f9837
     */
    function setAPI3Feed(bytes32 _ticker, address _feedAddr, uint256 _staleTime, bool _isClosable) external;

    /**
     * @notice Sets market status provider
     * @param _provider market status provider address
     */
    function setMarketStatusProvider(address _provider) external;
}
