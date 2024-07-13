// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";

contract KrAssetPayload is ArbDeployAddr {
    address public immutable newAssetAddr;

    constructor(address _newAssetAddr) {
        newAssetAddr = _newAssetAddr;
    }

    function executePayload() external {
        require(cs().assets[newAssetAddr].ticker != bytes32(0), "Invalid asset address or asset not added to protocol");

        scdp().isRoute[krSOLAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krSOLAddr] = true;

        scdp().isRoute[krETHAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krETHAddr] = true;

        scdp().isRoute[krBTCAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krBTCAddr] = true;

        scdp().isRoute[kissAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][kissAddr] = true;

        scdp().isRoute[krGBPAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krGBPAddr] = true;

        scdp().isRoute[krEURAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krEURAddr] = true;

        scdp().isRoute[krJPYAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krJPYAddr] = true;

        scdp().isRoute[krXAUAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krXAUAddr] = true;

        scdp().isRoute[krXAGAddr][newAssetAddr] = true;
        scdp().isRoute[newAssetAddr][krXAGAddr] = true;
    }
}
