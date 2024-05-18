// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";

contract PayloadEUR is ArbDeployAddr {
    address public immutable krEURAddr;

    constructor(address _krEURAddr) {
        krEURAddr = _krEURAddr;
    }

    function executePayload() external {
        require(cs().assets[krEURAddr].ticker == bytes32("EUR"), "Invalid krEUR address or not added to protocol");

        scdp().isRoute[krSOLAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][krSOLAddr] = true;

        scdp().isRoute[krETHAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][krETHAddr] = true;

        scdp().isRoute[krBTCAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][krBTCAddr] = true;

        scdp().isRoute[kissAddr][krEURAddr] = true;
        scdp().isRoute[krEURAddr][kissAddr] = true;
    }
}

contract PayloadJPY is ArbDeployAddr {
    address public immutable krJPYAddr;
    address internal krEURAddr = 0x83BB68a7437b02ebBe1ab2A0E8B464CC5510Aafe;

    constructor(address _krJPYAddr) {
        krJPYAddr = _krJPYAddr;
    }

    function executePayload() external {
        require(cs().assets[krJPYAddr].ticker == bytes32("JPY"), "Invalid krEUR address or not added to protocol");

        scdp().isRoute[krSOLAddr][krJPYAddr] = true;
        scdp().isRoute[krJPYAddr][krSOLAddr] = true;

        scdp().isRoute[krETHAddr][krJPYAddr] = true;
        scdp().isRoute[krJPYAddr][krETHAddr] = true;

        scdp().isRoute[krBTCAddr][krJPYAddr] = true;
        scdp().isRoute[krJPYAddr][krBTCAddr] = true;

        scdp().isRoute[kissAddr][krJPYAddr] = true;
        scdp().isRoute[krJPYAddr][kissAddr] = true;

        scdp().isRoute[krEURAddr][krJPYAddr] = true;
        scdp().isRoute[krJPYAddr][krEURAddr] = true;
    }
}
