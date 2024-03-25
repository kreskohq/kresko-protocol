// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Task} from "scripts/Task.s.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {BurnArgs, MintArgs, SwapArgs} from "common/Args.sol";
import {JSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {toWad} from "common/funcs/Math.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract TaskTest is Tested, Task {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    address constant binance = 0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D;
    address constant underlyingHolder = 0x4bb7f4c3d47C4b431cb0658F44287d52006fb506;
    address assetAddr;

    Asset asset;
    IKreskoAsset krAsset;
    IKreskoAssetAnchor akrAsset;

    function setUp() public {
        prank(safe);
        deal(safe, 10 ether);

        vm.createSelectFork("arbitrum");

        assetAddr = payload0003();
        asset = kresko.getAsset(assetAddr);

        krAsset = IKreskoAsset(assetAddr);
        akrAsset = IKreskoAssetAnchor(asset.anchor);

        manager.whitelist(binance, true);
        manager.whitelist(underlyingHolder, true);

        prank(binance);
        approvals();
        krAsset.approve(address(kresko), type(uint256).max);

        prank(underlyingHolder);
        approvals();
        krAsset.approve(address(kresko), type(uint256).max);
        fetchPythAndUpdate();
        syncTimeLocal();
    }

    function test_added_krAsset() public {
        asset.anchor.notEq(address(0), "krAsset-anchor");
        asset.kFactor.gt(0, "krAsset-kFactor");
        asset.closeFee.gt(0, "krAsset-closeFee");
    }

    function test_trade_krAsset() public {
        kresko.getSwapEnabledSCDP(assetAddr, kissAddr).eq(true, "newKrAsset-swap-enabled");
        kresko.getSwapEnabledSCDP(kissAddr, assetAddr).eq(true, "kiss-swap-enabled");

        kresko.getSwapEnabledSCDP(krETHAddr, assetAddr).eq(true, "krETH-newKrAsset-swap-enabled");
        kresko.getSwapEnabledSCDP(assetAddr, krETHAddr).eq(true, "newKrAsset-krETH-swap-enabled");

        kresko.getSwapEnabledSCDP(krBTCAddr, assetAddr).eq(true, "krETH-newKrAsset-swap-enabled");
        kresko.getSwapEnabledSCDP(assetAddr, krBTCAddr).eq(true, "newKrAsset-krETH-swap-enabled");

        prank(binance);
        uint256 swapAmountKISS = 1000 ether;
        getKISSM(binance, swapAmountKISS);
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: kissAddr,
                assetOut: assetAddr,
                amountIn: swapAmountKISS,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
        uint256 krAssetBal = krAsset.balanceOf(binance);
        krAssetBal.gt(0, "1-newKrAsset-balance");
        kresko.getDebtSCDP(assetAddr).eq(krAssetBal, "1-newKrAsset-debt");
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: assetAddr,
                assetOut: krETHAddr,
                amountIn: krAssetBal,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        uint256 krETHbal = krETH.balanceOf(binance);
        krETHbal.gt(0, "2-krETH-balance");
        kresko.getDebtSCDP(assetAddr).eq(0, "2-newKrAsset-debt");
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: krETHAddr,
                amountIn: krETHbal,
                assetOut: assetAddr,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        krAssetBal = krAsset.balanceOf(binance);
        krAssetBal.gt(0, "3-newKrAsset-balance");
        kresko.getDebtSCDP(assetAddr).eq(krAssetBal, "3-newKrAsset-debt");
        kresko.swapSCDP(
            SwapArgs({
                receiver: binance,
                assetIn: assetAddr,
                assetOut: kissAddr,
                amountIn: krAssetBal,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        uint256 kissBalAfter = kiss.balanceOf(binance);
        kissBalAfter.gt(0, "4-kiss-balance-zero");
        kissBalAfter.lt(swapAmountKISS, "4-KISS-balance-lt-start");
        kresko.getDebtSCDP(assetAddr).eq(0, "4-newKrAsset-debt");
        krAsset.totalSupply().eq(0, "4-newKrAsset-total-supply");
    }

    function test_mint_krAsset() public pranked(binance) {
        uint256 mintAmount = 0.1 ether;
        uint256 usdcDeposit = 20000e6;

        uint256 mintValue = getValue(assetAddr, mintAmount);
        uint256 feeValue = mintValue.pctMul(asset.closeFee);
        uint256 usdcValue = getValue(USDCAddr, usdcDeposit);

        kresko.depositCollateral(binance, USDCAddr, usdcDeposit);
        kresko.mintKreskoAsset(
            MintArgs({account: binance, krAsset: assetAddr, amount: mintAmount, receiver: binance}),
            pythUpdate
        );

        akrAsset.totalAssets().eq(mintAmount, "akrAsset-total-assets");
        akrAsset.totalSupply().eq(mintAmount, "akrAsset-total-supply");
        krAsset.totalSupply().eq(mintAmount, "krAsset-minted-amount");

        krAsset.balanceOf(binance).eq(mintAmount, "krAsset-minted-amount");
        kresko.getAccountDebtAmount(binance, assetAddr).eq(mintAmount, "krAsset-debt-amount");

        (uint256 debt, uint256 debtAdj) = kresko.getAccountTotalDebtValues(binance);
        debt.eq(mintValue, "krAsset-debt-value");
        debtAdj.eq(mintValue.pctMul(asset.kFactor), "krAsset-debt-value-adj");

        kresko.burnKreskoAsset(
            BurnArgs({krAsset: assetAddr, amount: mintAmount, account: binance, mintIndex: 0, repayee: binance}),
            pythUpdate
        );

        kresko.getAccountDebtAmount(binance, assetAddr).eq(0, "krAsset-debt-amount");
        kresko.getAccountTotalDebtValue(binance).eq(0, "krAsset-debt-value");
        (uint256 usdcValAfter, ) = kresko.getAccountTotalCollateralValues(binance);

        usdcValAfter.closeTo(usdcValue - feeValue, 100, "usdc-value-after");
    }

    // function test_krAssetWrap() public pranked(underlyingHolder) {
    //     vm.skip(true);
    //     uint256 wrapAmount = 1e8;
    //     IKreskoAsset.Wrapping memory wrap = krAsset.wrappingInfo();
    //     wrap.feeRecipient.eq(safe, "krAsset-fee-recipient");

    //     krAsset.wrap(underlyingHolder, wrapAmount);
    //     uint256 amtAfterFees = wrapAmount.pctMul(1e4 - wrap.openFee);
    //     uint256 amtAfterFeesWad = toWad(amtAfterFees, 8);

    //     krAsset.balanceOf(underlyingHolder).eq(amtAfterFeesWad, "krAsset-wrapped-amount");

    //     uint256 feesIn = wrapAmount - amtAfterFees;
    //     underlying.balanceOf(assetAddr).eq(amtAfterFees, "krAsset-underlying-amount");
    //     underlying.balanceOf(safe).eq(feesIn, "krAsset-underlying-amount");

    //     akrAsset.totalAssets().eq(amtAfterFeesWad, "akrAsset-total-assets");
    //     akrAsset.totalSupply().eq(amtAfterFeesWad, "akrAsset-total-supply");
    //     krAsset.totalSupply().eq(amtAfterFeesWad, "krAsset-minted-amount");

    //     krAsset.unwrap(underlyingHolder, amtAfterFees, false);

    //     uint256 feesOut = amtAfterFees.pctMul(wrap.closeFee);
    //     underlying.balanceOf(assetAddr).eq(0, "krAsset-underlying-amount");
    //     krAsset.balanceOf(underlyingHolder).eq(0, "krAsset-wrapped-amount");

    //     underlying.balanceOf(safe).eq(feesIn + feesOut, "krAsset-underlying-amount");
    // }
}
