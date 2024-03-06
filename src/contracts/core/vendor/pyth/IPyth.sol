// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 exp;
        uint256 timestamp;
    }

    function getPriceNoOlderThan(bytes32 _id, uint256 _maxAge) external view returns (Price memory);

    function getPriceUnsafe(bytes32 _id) external view returns (Price memory);

    function getUpdateFee(bytes[] memory _updateData) external view returns (uint256);

    function updatePriceFeeds(bytes[] memory _updateData) external payable;

    function updatePriceFeedsIfNecessary(
        bytes[] memory _updateData,
        bytes32[] memory _ids,
        uint64[] memory _publishTimes
    ) external payable;

    // Function arguments are invalid (e.g., the arguments lengths mismatch)
    // Signature: 0xa9cb9e0d
    error InvalidArgument();
    // Update data is coming from an invalid data source.
    // Signature: 0xe60dce71
    error InvalidUpdateDataSource();
    // Update data is invalid (e.g., deserialization error)
    // Signature: 0xe69ffece
    error InvalidUpdateData();
    // Insufficient fee is paid to the method.
    // Signature: 0x025dbdd4
    error InsufficientFee();
    // There is no fresh update, whereas expected fresh updates.
    // Signature: 0xde2c57fa
    error NoFreshUpdate();
    // There is no price feed found within the given range or it does not exists.
    // Signature: 0x45805f5d
    error PriceFeedNotFoundWithinRange();
    // Price feed not found or it is not pushed on-chain yet.
    // Signature: 0x14aebe68
    error PriceFeedNotFound();
    // Requested price is stale.
    // Signature: 0x19abf40e
    error StalePrice();
    // Given message is not a valid Wormhole VAA.
    // Signature: 0x2acbe915
    error InvalidWormholeVaa();
    // Governance message is invalid (e.g., deserialization error).
    // Signature: 0x97363b35
    error InvalidGovernanceMessage();
    // Governance message is not for this contract.
    // Signature: 0x63daeb77
    error InvalidGovernanceTarget();
    // Governance message is coming from an invalid data source.
    // Signature: 0x360f2d87
    error InvalidGovernanceDataSource();
    // Governance message is old.
    // Signature: 0x88d1b847
    error OldGovernanceMessage();
    // The wormhole address to set in SetWormholeAddress governance is invalid.
    // Signature: 0x13d3ed82
    error InvalidWormholeAddressToSet();
}
