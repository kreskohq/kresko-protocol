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
import {Vault} from "vault/Vault.sol";
import {Errors} from "common/Errors.sol";
import {console} from "forge-std/console.sol";
// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0004Test is Tested, Task0004 {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    address internal constant krSOLAddr = 0x96084d2E3389B85f2Dc89E321Aaa3692Aed05eD2;
    address constant binance = 0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D;
    address constant underlyingHolder = 0x4bb7f4c3d47C4b431cb0658F44287d52006fb506;
    IKreskoAsset krSOL = IKreskoAsset(krSOLAddr);
    function setUp() public {
        currentForkId = vm.createSelectFork("arbitrum");
        console.log(currentForkId, "in setup");

        prank(safe);
        manager.whitelist(binance, true);
        manager.whitelist(underlyingHolder, true);

        prank(binance);
        approvals();
        kiss.approve(address(kresko), type(uint256).max);

        fetchPythAndUpdate();
        syncTimeLocal();
    }

    function test_executePayload0004() public {
        uint256 prevAvailabilityUSDC = vault.maxDeposit(USDCAddr);
        uint256 prevAvailabilityUSDCe = vault.maxDeposit(USDCeAddr);

        kresko.getAsset(kissAddr).maxDebtSCDP.eq(25_000 ether, "kiss max debt before");
        kresko.getAsset(kissAddr).depositLimitSCDP.eq(100_000 ether, "kiss deposit limit before");
        kresko.getAsset(krETHAddr).maxDebtSCDP.eq(5 ether, "krETH max debt before");
        kresko.getAsset(krBTCAddr).maxDebtSCDP.eq(0.5 ether, "krBTC max debt before");
        kresko.getAsset(krSOLAddr).maxDebtSCDP.eq(200 ether, "krSOL max debt before");

        kresko.getParametersSCDP().minCollateralRatio.eq(400e2, "SCDP MCR before");

        payload0004();

        kresko.getAsset(kissAddr).maxDebtSCDP.eq(60_000 ether, "kiss max debt after");
        kresko.getAsset(kissAddr).depositLimitSCDP.eq(200_000 ether, "kiss deposit limit after");
        kresko.getAsset(krETHAddr).maxDebtSCDP.eq(16.5 ether, "krETH max debt after");
        kresko.getAsset(krBTCAddr).maxDebtSCDP.eq(0.85 ether, "krBTC max debt after");
        kresko.getAsset(krSOLAddr).maxDebtSCDP.eq(310 ether, "krSOL max debt after");

        assertEq(kresko.getParametersSCDP().minCollateralRatio, 350e2, "SCDP MCR after");

        vault.maxDeposit(USDCAddr).eq(prevAvailabilityUSDC + 100_000e6, "USDC max deposit");
        vault.maxDeposit(USDCeAddr).eq(prevAvailabilityUSDCe + 100_000e6, "USDCe max deposit");
    }

    function test_vault_deposits_before_and_after_payload_execution() public {
        uint256 prevAvailabilityUSDC = vault.maxDeposit(USDCAddr);
        uint256 prevAvailabilityUSDCe = vault.maxDeposit(USDCeAddr);

        prank(binance);
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.EXCEEDS_ASSET_DEPOSIT_LIMIT.selector,
                Errors.ID({symbol: USDC.symbol(), addr: USDCAddr}),
                prevAvailabilityUSDC + 1,
                prevAvailabilityUSDC
            )
        );
        vault.deposit(USDCAddr, prevAvailabilityUSDC + 1, binance);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.EXCEEDS_ASSET_DEPOSIT_LIMIT.selector,
                Errors.ID({symbol: USDCe.symbol(), addr: USDCeAddr}),
                prevAvailabilityUSDCe + 1,
                prevAvailabilityUSDCe
            )
        );
        vault.deposit(USDCeAddr, prevAvailabilityUSDCe + 1, binance);

        payload0004();

        vault.maxDeposit(USDCAddr).eq(prevAvailabilityUSDC + 100_000e6, "USDC max deposit");
        vault.maxDeposit(USDCeAddr).eq(prevAvailabilityUSDCe + 100_000e6, "USDCe max deposit");

        prank(binance);
        approvals();

        (, uint256 feesUSDC) = vault.deposit(USDCAddr, prevAvailabilityUSDC + 1, binance);
        (, uint256 feesUSDCe) = vault.deposit(USDCeAddr, prevAvailabilityUSDCe + 1, binance);

        vault.maxDeposit(USDCAddr).eq(100_000e6 - 1 + feesUSDC, "USDC max deposit after");
        vault.maxDeposit(USDCeAddr).eq(100_000e6 - 1 + feesUSDCe, "USDCe max deposit after");
    }

    function test_SCDP_KISS_deposits() public {
        uint256 amount = 100_000 ether;
        prank(binance);
        deal(address(kiss), binance, amount);
        uint256 currentDeposits = kresko.getDepositsSCDP(address(kiss));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.EXCEEDS_ASSET_DEPOSIT_LIMIT.selector,
                Errors.ID({symbol: kiss.symbol(), addr: kissAddr}),
                currentDeposits + amount,
                kresko.getAsset(kissAddr).depositLimitSCDP
            )
        );
        kresko.depositSCDP(binance, address(kiss), amount);
        console.log(currentForkId, "before");

        payload0004();

        console.log(currentForkId, "after");
        prank(safe);
        manager.whitelist(binance, true);

        prank(binance);
        approvals();
        deal(address(kiss), binance, amount);
        kresko.depositSCDP(binance, address(kiss), amount);

        kresko.getDepositsSCDP(address(kiss)).eq(currentDeposits + amount, "KISS deposits");
    }

    function test_SCDP_SWAPS() public {
        uint256 swapAmountKISS = 50000 ether;
        getKISSM(binance, swapAmountKISS);
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krETHAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krBTCAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        deal(address(krETH), binance, 10 ether);
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: krETHAddr,
                assetOut: kissAddr,
                amountIn: 10 ether,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        payload0004();

        prank(safe);
        manager.whitelist(binance, true);

        // Add collateral to allow swaps
        uint256 amount = 100_000 ether;
        prank(binance);
        approvals();
        deal(address(kiss), binance, amount);
        kresko.depositSCDP(binance, address(kiss), amount);

        fetchPythAndUpdate();
        syncTimeLocal();

        krETH.balanceOf(binance).eq(0, "krETH balance before swap");
        krBTC.balanceOf(binance).eq(0, "krBTC balance before swap");
        krSOL.balanceOf(binance).eq(0, "krSOL balance before swap");

        getKISSM(binance, swapAmountKISS * 3);

        // Swap KISS for krETH
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krETHAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
        // Swap krETH for KISS
        uint balBefore = kiss.balanceOf(binance);
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: krETHAddr,
                assetOut: kissAddr,
                amountIn: krETH.balanceOf(binance),
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
        kiss.balanceOf(binance).gt(balBefore, "KISS balance after swap");
        krETH.balanceOf(binance).eq(0, "krETH balance after swap");

        // Swap KISS for krBTC
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krBTCAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
        krBTC.balanceOf(binance).gt(0, "krBTC balance after swap");

        // Swap krBTC for KISS
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: krBTCAddr,
                assetOut: kissAddr,
                amountIn: krBTC.balanceOf(binance),
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        krBTC.balanceOf(binance).eq(0, "krBTC balance after swap back");

        // Swap KISS for krSOL
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        krSOL.balanceOf(binance).gt(0, "krSOL balance after swap");
    }
}
