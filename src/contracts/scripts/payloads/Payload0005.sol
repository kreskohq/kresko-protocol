// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {cs} from "common/State.sol";

contract Payload0005 {
    address internal constant KISSAddr = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;
    address internal constant krETHAddr = 0x24dDC92AA342e92f26b4A676568D04d2E3Ea0abc;
    address internal constant krBTCAddr = 0x11EF4EcF3ff1c8dB291bc3259f3A4aAC6e4d2325;
    address internal constant krSOLAddr = 0x96084d2E3389B85f2Dc89E321Aaa3692Aed05eD2;

    function executePayload() external {
        require(cs().assets[KISSAddr].openFee == 0, "incorrect existing KISS openFee");
        require(cs().assets[KISSAddr].closeFee == 0, "incorrect existing KISS maxDebtSCDP");
        require(cs().assets[KISSAddr].isMinterMintable == false, "incorrect existing KISS isMinterMintable");
        require(cs().assets[KISSAddr].maxDebtMinter == 0, "incorrect existing KISS maxDebtMinter");

        require(cs().assets[krETHAddr].maxDebtMinter == 20 ether, "incorrect existing krETH maxDebtMinter");

        cs().assets[KISSAddr].openFee = 5;
        cs().assets[KISSAddr].closeFee = 50;
        cs().assets[KISSAddr].isMinterMintable = true;
        cs().assets[KISSAddr].maxDebtMinter = 140000 ether;

        cs().assets[krETHAddr].maxDebtMinter = 40 ether;
    }
}
