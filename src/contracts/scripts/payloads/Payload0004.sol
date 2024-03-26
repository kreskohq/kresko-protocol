// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {cs} from "common/State.sol";
import {scdp} from "scdp/SState.sol";

contract Payload0004 {
    address internal constant KISSAddr = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;
    address internal constant krETHAddr = 0x24dDC92AA342e92f26b4A676568D04d2E3Ea0abc;
    address internal constant krBTCAddr = 0x11EF4EcF3ff1c8dB291bc3259f3A4aAC6e4d2325;
    address internal constant krSOLAddr = 0x96084d2E3389B85f2Dc89E321Aaa3692Aed05eD2;

    function executePayload() external {
        require(cs().assets[KISSAddr].depositLimitSCDP == 100_000 ether, "incorrect existing KISS depositLimitSCDP");
        require(cs().assets[KISSAddr].maxDebtSCDP == 25_000 ether, "incorrect existing KISS maxDebtSCDP");
        require(cs().assets[krETHAddr].maxDebtSCDP == 5 ether, "incorrect existing krETH maxDebtSCDP");
        require(cs().assets[krBTCAddr].maxDebtSCDP == 0.5 ether, "incorrect existing krBTC maxDebtSCDP");
        require(cs().assets[krSOLAddr].maxDebtSCDP == 200 ether, "incorrect existing krSOL maxDebtSCDP");
        require(scdp().minCollateralRatio == 400e2, "incorrect existing minCollateralRatio");

        cs().assets[KISSAddr].depositLimitSCDP = 200_000 ether;

        cs().assets[KISSAddr].maxDebtSCDP = 60_000 ether;
        cs().assets[krETHAddr].maxDebtSCDP = 16.5 ether;
        cs().assets[krBTCAddr].maxDebtSCDP = 0.85 ether;
        cs().assets[krSOLAddr].maxDebtSCDP = 310 ether;

        scdp().minCollateralRatio = 350e2;
    }
}
