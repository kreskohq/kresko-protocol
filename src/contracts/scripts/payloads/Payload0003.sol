// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";

contract Payload0003 {
    address internal constant KISSAddr = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;
    address internal constant krETHAddr = 0x24dDC92AA342e92f26b4A676568D04d2E3Ea0abc;
    address internal constant krBTCAddr = 0x11EF4EcF3ff1c8dB291bc3259f3A4aAC6e4d2325;
    address public immutable krSOLAddr;

    constructor(address _krSOLAddr) {
        krSOLAddr = _krSOLAddr;
    }

    function executePayload() external {
        require(cs().assets[krSOLAddr].ticker == bytes32("SOL"), "Invalid krSOL address or not added to protocol");

        scdp().isRoute[krSOLAddr][KISSAddr] = true;
        scdp().isRoute[KISSAddr][krSOLAddr] = true;

        scdp().isRoute[krETHAddr][krSOLAddr] = true;
        scdp().isRoute[krSOLAddr][krETHAddr] = true;

        scdp().isRoute[krBTCAddr][krSOLAddr] = true;
        scdp().isRoute[krSOLAddr][krBTCAddr] = true;
    }
}
