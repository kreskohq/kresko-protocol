// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";

contract PayloadKrEUR is ArbDeployAddr {
    address public immutable krEURAddr;

    constructor(address _krEURAddr) {
        krEURAddr = _krEURAddr;
    }

    function executePayload() external {
        require(cs().assets[krEURAddr].ticker == bytes32("EUR"), "Invalid krEUR address or not added to protocol");

        scdp().isRoute[krEURAddr][kissAddr] = true;
        scdp().isRoute[kissAddr][krEURAddr] = true;

        scdp().isRoute[krETHAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][krETHAddr] = true;

        scdp().isRoute[krBTCAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][krBTCAddr] = true;

        scdp().isRoute[krSOLAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][krSOLAddr] = true;
    }
}
