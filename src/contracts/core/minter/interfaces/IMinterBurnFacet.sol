// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {BurnArgs} from "common/Args.sol";

interface IMinterBurnFacet {
    /**
     * @notice Burns existing Kresko assets.
     * @notice Manager role is required if the caller is not the account being repaid to or the account repaying.
     * @param args Burn arguments
     * @param _updateData Price update data
     */
    function burnKreskoAsset(BurnArgs memory args, bytes[] calldata _updateData) external payable;
}
