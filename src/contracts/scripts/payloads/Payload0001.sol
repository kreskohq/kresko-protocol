// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";

contract Payload0001 {
    address internal constant KISSAddr = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;
    address internal constant krETHAddr = 0x24dDC92AA342e92f26b4A676568D04d2E3Ea0abc;
    address public immutable krBTCAddr;

    constructor(address _krBTCAddr) {
        krBTCAddr = _krBTCAddr;
    }

    function executePayload() external {
        require(cs().assets[krBTCAddr].ticker == bytes32("BTC"), "Invalid krBTC address");

        cs().assets[KISSAddr].maxDebtSCDP = 25_000 ether;
        cs().assets[KISSAddr].depositLimitSCDP = 100_000 ether;
        cs().assets[krETHAddr].maxDebtSCDP = 5 ether;

        scdp().isRoute[krBTCAddr][KISSAddr] = true;
        scdp().isRoute[KISSAddr][krBTCAddr] = true;

        scdp().isRoute[krETHAddr][krBTCAddr] = true;
        scdp().isRoute[krBTCAddr][krETHAddr] = true;
    }
}
