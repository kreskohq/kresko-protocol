// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

interface IBatchFacet {
    /**
     * @notice Performs batched calls to the protocol with a single price update.
     * @param _calls Calls to perform.
     * @param _updateData Pyth price data to use for the calls.
     */
    function batchCall(bytes[] calldata _calls, bytes[] calldata _updateData) external payable;

    /**
     * @notice Performs "static calls" with the update prices through `batchCallToError`, using a try-catch.
     * Refunds the msg.value sent for price update fee.
     * @param _staticCalls Calls to perform.
     * @param _updateData Pyth price update preview with the static calls.
     * @return timestamp Timestamp of the data.
     * @return results Static call results as bytes[]
     */
    function batchStaticCall(
        bytes[] calldata _staticCalls,
        bytes[] calldata _updateData
    ) external payable returns (uint256 timestamp, bytes[] memory results);

    /**
     * @notice Performs supplied calls and reverts a `Errors.BatchResult` containing returned results as bytes[].
     * @param _calls Calls to perform.
     * @param _updateData Pyth price update data to use for the static calls.
     * @return `Errors.BatchResult` which needs to be caught and decoded on-chain (according to the result signature).
     * Use `batchStaticCall` for a direct return.
     */
    function batchCallToError(
        bytes[] calldata _calls,
        bytes[] calldata _updateData
    ) external payable returns (uint256, bytes[] memory);

    /**
     * @notice Used to transform bytes memory -> calldata by external call, then calldata slices the error selector away.
     * @param _errorData Error data to decode.
     * @return timestamp Timestamp of the data.
     * @return results Static call results as bytes[]
     */
    function decodeErrorData(bytes calldata _errorData) external pure returns (uint256 timestamp, bytes[] memory results);
}
