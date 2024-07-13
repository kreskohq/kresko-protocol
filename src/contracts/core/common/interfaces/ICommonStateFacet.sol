// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {Enums} from "common/Constants.sol";
import {Oracle} from "common/Types.sol";

interface ICommonStateFacet {
    /// @notice The recipient of protocol fees.
    function getFeeRecipient() external view returns (address);

    /// @notice The pyth endpoint.
    function getPythEndpoint() external view returns (address);

    /// @notice Offchain oracle decimals
    function getDefaultOraclePrecision() external view returns (uint8);

    /// @notice max deviation between main oracle and fallback oracle
    function getOracleDeviationPct() external view returns (uint16);

    /// @notice Get the market status provider address.
    function getMarketStatusProvider() external view returns (address);

    /// @notice Get the L2 sequencer uptime feed address.
    function getSequencerUptimeFeed() external view returns (address);

    /// @notice Get the L2 sequencer uptime feed grace period
    function getSequencerGracePeriod() external view returns (uint32);

    /**
     * @notice Get configured feed of the ticker
     * @param _ticker Ticker in bytes32, eg. bytes32("ETH").
     * @param _oracleType The oracle type.
     * @return feedAddr Feed address matching the oracle type given.
     */
    function getOracleOfTicker(bytes32 _ticker, Enums.OracleType _oracleType) external view returns (Oracle memory);

    function getChainlinkPrice(bytes32 _ticker) external view returns (uint256);

    function getVaultPrice(bytes32 _ticker) external view returns (uint256);

    function getRedstonePrice(bytes32 _ticker) external view returns (uint256);

    function getAPI3Price(bytes32 _ticker) external view returns (uint256);

    function getPythPrice(bytes32 _ticker) external view returns (uint256);
}
