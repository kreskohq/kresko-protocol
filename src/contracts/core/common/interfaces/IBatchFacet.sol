// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

interface IBatchFacet {
    /**
     * @notice Performs number of calls in the protocol with a single price update.
     * @param _calls The calls to perform.
     * @param _updateData The pyth price update data to use for the calls.
     */
    function batchCall(bytes[] calldata _calls, bytes[] calldata _updateData) external payable;

    /**
     * @notice Performs static calls with updated prices using a try-catch, returns the bytes[] results and msg.value.
     * @param _staticCalls The static calls to perform.
     * @param _updateData The pyth price update data to use for the static calls.
     * @return timestamp Timestamp of the data.
     * @return results Call results as bytes[]
     */
    function batchStaticCall(
        bytes[] calldata _staticCalls,
        bytes[] calldata _updateData
    ) external payable returns (uint256 timestamp, bytes[] memory results);

    /**
     * @notice Performs supplied static calls and reverts with `Errors.BatchResult` which contains the result as bytes[].
     * @param _staticCalls The static calls to perform.
     * @param _updateData The pyth price update data to use for the static calls.
     * @return `Errors.BatchResult`, which needs to be caught and decoded (according to the result signature).
     * Use `batchStaticCall` for a direct return.
     */
    function batchStaticCallToError(
        bytes[] calldata _staticCalls,
        bytes[] calldata _updateData
    ) external payable returns (uint256, bytes[] memory);
}
