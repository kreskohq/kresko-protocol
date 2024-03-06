// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {MintArgs} from "common/Args.sol";

interface IMinterMintFacet {
    /**
     * @notice Mints new Kresko assets.
     * @param _args MintArgs struct containing the arguments necessary to perform a mint.
     */
    function mintKreskoAsset(MintArgs memory _args, bytes[] calldata _updateData) external payable;
}
