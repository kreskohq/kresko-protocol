// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommonConfigurationFacet {
    /**
     * @notice Updates the fee recipient.
     * @param _newFeeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _newFeeRecipient) external;

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _newMinDebtValue The new minimum debt value as a wad.
     */
    function updateMinDebtValue(uint64 _newMinDebtValue) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _decimals Amount of decimals
     */
    function updateExtOracleDecimals(uint8 _decimals) external;

    /**
     * @notice Sets the decimal precision of external oracle
     * @param _oracleDeviationPct Amount of decimals
     */
    function updateOracleDeviationPct(uint16 _oracleDeviationPct) external;

    /**
     * @notice Sets L2 sequencer uptime feed address
     * @param _sequencerUptimeFeed sequencer uptime feed address
     */
    function updateSequencerUptimeFeed(address _sequencerUptimeFeed) external;

    /**
     * @notice Sets sequencer grace period time
     * @param _sequencerGracePeriodTime grace period time
     */
    function updateSequencerGracePeriodTime(uint24 _sequencerGracePeriodTime) external;

    /**
     * @notice Sets oracle timeout
     * @param _oracleTimeout oracle timeout in seconds
     */
    function updateOracleTimeout(uint32 _oracleTimeout) external;

    /**
     * @notice Sets phase of gating mechanism
     * @param _phase phase id
     */
    function updatePhase(uint8 _phase) external;

    /**
     * @notice Sets address of Kreskian NFT contract
     * @param _kreskian kreskian nft contract address
     */
    function updateKreskian(address _kreskian) external;

    /**
     * @notice Sets address of Quest For Kresk NFT contract
     * @param _questForKresk Quest For Kresk NFT contract address
     */
    function updateQuestForKresk(address _questForKresk) external;
}
