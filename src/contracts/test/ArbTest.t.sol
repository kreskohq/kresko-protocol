// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Asset} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {ArbTask} from "scripts/ArbTask.s.sol";
import {ParamPayload} from "scripts/ParamPayload.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {BurnArgs, MintArgs} from "common/Args.sol";
import {JSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {toWad} from "common/funcs/Math.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract ArbTaskTest is Tested, ArbTask {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    address constant binance = 0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D;
    address constant wbtcHolder = 0x4bb7f4c3d47C4b431cb0658F44287d52006fb506;

    Asset krBTCResult;
    Asset ARBResult;
    IKreskoAsset krBTC;
    IKreskoAssetAnchor akrBTC;

    function setUp() public fork("arbitrum") {
        prank(safe);
        deal(safe, 10 ether);

        JSON.Config memory json = ArbTask.beforeRun();
        (Asset memory krBTCCfg, LibDeploy.DeployedKrAsset memory deployment) = ArbTask.addKrAsset(json, "krBTC");
        Asset memory ARBCfg = ArbTask.addExtAsset(json, "ARB");

        krBTCResult = krBTCCfg;
        ARBResult = ARBCfg;

        krBTC = IKreskoAsset(deployment.addr);
        akrBTC = IKreskoAssetAnchor(deployment.anchorAddr);

        manager.whitelist(binance, true);
        manager.whitelist(wbtcHolder, true);

        prank(binance);
        approvals();

        prank(wbtcHolder);
        approvals();
        WBTC.approve(address(krBTC), type(uint256).max);
    }

    function test_paramPayload() public {
        prank(safe);
        executeParams(address(krBTC));
        kresko.getSwapEnabledSCDP(address(krBTC), kissAddr).eq(true, "krBTC-swap-enabled");
        kresko.getSwapEnabledSCDP(kissAddr, address(krBTC)).eq(true, "kiss-swap-enabled");

        kresko.getSwapEnabledSCDP(krETHAddr, address(krBTC)).eq(true, "krETH-BTC-swap-enabled");
        kresko.getSwapEnabledSCDP(address(krBTC), krETHAddr).eq(true, "krBTC-ETH-swap-enabled");

        prank(binance);
        getKISSM(binance, 50000 ether);
        kresko.depositSCDP(binance, kissAddr, 50000 ether);
    }

    function test_krBTCMinter() public pranked(binance) {
        uint256 mintAmount = 0.01 ether;
        uint256 usdcDeposit = 20000e6;

        uint256 mintValue = getValue(address(krBTC), mintAmount);
        uint256 feeValue = mintValue.pctMul(krBTCResult.closeFee);
        uint256 usdcValue = getValue(USDCAddr, usdcDeposit);

        kresko.depositCollateral(binance, USDCAddr, usdcDeposit);
        kresko.mintKreskoAsset(
            MintArgs({account: binance, krAsset: address(krBTC), amount: mintAmount, receiver: binance}),
            pythUpdate
        );

        akrBTC.totalAssets().eq(mintAmount, "akrBTC-total-assets");
        akrBTC.totalSupply().eq(mintAmount, "akrBTC-total-supply");
        krBTC.totalSupply().eq(mintAmount, "krBTC-minted-amount");

        krBTC.balanceOf(binance).eq(mintAmount, "krBTC-minted-amount");
        kresko.getAccountDebtAmount(binance, address(krBTC)).eq(mintAmount, "krBTC-debt-amount");

        (uint256 debt, uint256 debtAdj) = kresko.getAccountTotalDebtValues(binance);
        debt.eq(mintValue, "krBTC-debt-value");
        debtAdj.eq(mintValue.pctMul(krBTCResult.kFactor), "krBTC-debt-value-adj");

        kresko.burnKreskoAsset(
            BurnArgs({krAsset: address(krBTC), amount: mintAmount, account: binance, mintIndex: 0, repayee: binance}),
            pythUpdate
        );

        kresko.getAccountDebtAmount(binance, address(krBTC)).eq(0, "krBTC-debt-amount");
        kresko.getAccountTotalDebtValue(binance).eq(0, "krBTC-debt-value");
        (uint256 usdcValAfter, ) = kresko.getAccountTotalCollateralValues(binance);

        usdcValAfter.closeTo(usdcValue - feeValue, 100, "usdc-value-after");
    }

    function test_ARBDeposit() public pranked(binance) {
        uint256 depositAmount = 1000 ether;
        uint256 mintAmount = 0.01 ether;

        kresko.depositCollateral(binance, ARBAddr, depositAmount);

        kresko.mintKreskoAsset(
            MintArgs({account: binance, krAsset: address(krBTC), amount: mintAmount, receiver: binance}),
            pythUpdate
        );
        krBTC.balanceOf(binance).eq(mintAmount, "krBTC-minted-amount");
        kresko.getAccountDebtAmount(binance, address(krBTC)).eq(mintAmount, "krBTC-debt-amount");
    }

    function test_krBTCWraps() public pranked(wbtcHolder) {
        uint256 wrapAmount = 1e8;
        IKreskoAsset.Wrapping memory wrap = krBTC.wrappingInfo();
        wrap.feeRecipient.eq(safe, "krBTC-fee-recipient");

        krBTC.wrap(wbtcHolder, wrapAmount);
        uint256 amtAfterFees = wrapAmount.pctMul(1e4 - wrap.openFee);
        uint256 amtAfterFeesWad = toWad(amtAfterFees, 8);

        krBTC.balanceOf(wbtcHolder).eq(amtAfterFeesWad, "krBTC-wrapped-amount");

        uint256 feesIn = wrapAmount - amtAfterFees;
        WBTC.balanceOf(address(krBTC)).eq(amtAfterFees, "krBTC-WBTC-amount");
        WBTC.balanceOf(safe).eq(feesIn, "krBTC-WBTC-amount");

        akrBTC.totalAssets().eq(amtAfterFeesWad, "akrBTC-total-assets");
        akrBTC.totalSupply().eq(amtAfterFeesWad, "akrBTC-total-supply");
        krBTC.totalSupply().eq(amtAfterFeesWad, "krBTC-minted-amount");

        krBTC.unwrap(wbtcHolder, amtAfterFees, false);

        uint256 feesOut = amtAfterFees.pctMul(wrap.closeFee);
        WBTC.balanceOf(address(krBTC)).eq(0, "krBTC-WBTC-amount");
        krBTC.balanceOf(wbtcHolder).eq(0, "krBTC-wrapped-amount");

        WBTC.balanceOf(safe).eq(feesIn + feesOut, "krBTC-WBTC-amount");
    }
}
