// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Task0004} from "scripts/Task0004.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {BurnArgs, MintArgs, SwapArgs} from "common/Args.sol";
import {JSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {toWad} from "common/funcs/Math.sol";
import {IVault} from "vault/interfaces/IVault.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0004Test is Tested, Task0004 {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    address internal constant KISSAddr = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;
    address internal constant krBTCAddr = 0x11EF4EcF3ff1c8dB291bc3259f3A4aAC6e4d2325;
    address internal constant krSOLAddr = 0x96084d2E3389B85f2Dc89E321Aaa3692Aed05eD2;

    function setUp() public {
        prank(safe);

        vm.createSelectFork("arbitrum");
    }

    function test_executePayload0004() public {
        uint prevAvailabilityUSDC = vault.maxDeposit(USDCAddr);
        uint prevAvailabilityUSDCe = vault.maxDeposit(USDCeAddr);

        assertEq(kresko.getAsset(KISSAddr).maxDebtSCDP, 25_000 ether);
        assertEq(kresko.getAsset(krETHAddr).maxDebtSCDP, 5 ether);
        assertEq(kresko.getAsset(krBTCAddr).maxDebtSCDP, 0.5 ether);
        assertEq(kresko.getAsset(krSOLAddr).maxDebtSCDP, 200 ether);

        assertEq(kresko.getParametersSCDP().minCollateralRatio, 400e2);

        payload0004();

        assertEq(kresko.getAsset(KISSAddr).maxDebtSCDP, 60_000 ether);
        assertEq(kresko.getAsset(krETHAddr).maxDebtSCDP, 16.5 ether);
        assertEq(kresko.getAsset(krBTCAddr).maxDebtSCDP, 0.85 ether);
        assertEq(kresko.getAsset(krSOLAddr).maxDebtSCDP, 310 ether);

        assertEq(kresko.getParametersSCDP().minCollateralRatio, 350e2);

        vault.maxDeposit(USDCAddr).eq(prevAvailabilityUSDC + 100_000e6, "USDC max deposit");
        vault.maxDeposit(USDCeAddr).eq(prevAvailabilityUSDCe + 100_000e6, "USDCe max deposit");
    }
}
