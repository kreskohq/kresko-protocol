// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IMinterBurnHelperFacet {
    /**
     * @notice Attempts to close all debt positions and interest
     * @notice Account must have enough of krAsset balance to burn and enough KISS to cover interest
     * @param _account The address to close the positions for
     * @param _updateData Price update data
     */
    function closeAllDebtPositions(address _account, bytes[] calldata _updateData) external payable;

    /**
     * @notice Burns all Kresko asset debt and repays interest.
     * @notice Account must have enough of krAsset balance to burn and enough KISS to cover interest
     * @param _account The address to close the position for
     * @param _krAsset The address of the Kresko asset.
     * @param _updateData Price update data
     */
    function closeDebtPosition(address _account, address _krAsset, bytes[] calldata _updateData) external payable;
}
