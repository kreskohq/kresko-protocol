// solhint-disable state-visibility
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {View} from "periphery/ViewTypes.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {JSON} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {getConfig} from "scripts/deploy/libs/JSON.s.sol";
import {getMockPythViewPrices, getPythViewData, PythView} from "vendor/pyth/PythScript.sol";

contract PeripheryTest is Tested, Deploy {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using Deployed for *;

    MockERC20 internal usdc;
    MockERC20 internal wbtc;
    MockERC20 internal dai;
    IKreskoAsset internal krBTC;
    IKreskoAsset internal krETH;
    IKreskoAsset internal krJPY;
    IKreskoAsset internal krTSLA;

    uint256 constant ASSET_COUNT = 13;

    function setUp() public mnemonic("MNEMONIC_DEVNET") users(address(111), address(222), address(333)) {
        Deploy.deployTest(0);
        user0 = getAddr(0);
        user1 = getAddr(1);
        user2 = getAddr(2);

        usdc = MockERC20(("USDC").cached());
        wbtc = MockERC20(("WBTC").cached());
        dai = MockERC20(("DAI").cached());
        krBTC = IKreskoAsset(("krBTC").cached());
        krETH = IKreskoAsset(("krETH").cached());
        krJPY = IKreskoAsset(("krJPY").cached());
        krTSLA = IKreskoAsset(("krTSLA").cached());
    }

    function testProtocolDatas() public {
        JSON.Config memory cfg = getConfig("test", "test-base");
        View.Protocol memory protocol = dataV1.getGlobals(getMockPythViewPrices(cfg)).protocol;
        protocol.maxPriceDeviationPct.eq(cfg.params.common.maxPriceDeviationPct, "maxPriceDeviationPct");
        protocol.oracleDecimals.eq(cfg.params.common.oracleDecimals, "oracleDecimals");
        protocol.pythEp.notEq(address(0), "pythEp");
        protocol.isSequencerUp.eq(true, "isSequencerUp");
        protocol.safetyStateSet.eq(false, "safetyStateSet");
        protocol.sequencerGracePeriodTime.eq(cfg.params.common.sequencerGracePeriodTime, "sequencerGracePeriodTime");

        protocol.assets.length.eq(ASSET_COUNT, "assets");
        protocol.assets[0].symbol.eq("WETH", "symbol0");
        protocol.assets[0].price.eq(1911e8, "price0");

        protocol.assets[1].symbol.eq("WBTC", "symbol1");
        protocol.assets[1].price.eq(35159e8, "price1");

        protocol.assets[2].symbol.eq("USDC", "symbol2");
        protocol.assets[2].price.eq(1e8, "price2");

        protocol.assets[3].symbol.eq("USDC.e", "symbol3");
        protocol.assets[3].price.eq(1e8, "price3");

        protocol.assets[4].symbol.eq("USDT", "symbol4");
        protocol.assets[4].price.eq(1e8, "price4");

        protocol.assets[5].symbol.eq("DAI", "symbol5");
        protocol.assets[5].price.eq(0.9998e8, "price5");

        protocol.assets[6].symbol.eq("KISS", "symbol6");
        protocol.assets[6].price.eq(1e8, "price6");

        protocol.assets[7].symbol.eq("krETH", "symbol7");
        protocol.assets[7].price.eq(1911e8, "price7");

        protocol.minter.MCR.eq(cfg.params.minter.minCollateralRatio, "minter.mcr");
        protocol.minter.LT.eq(cfg.params.minter.liquidationThreshold, "minter.lt");
        protocol.minter.MLR.eq(cfg.params.minter.liquidationThreshold + 1e2, "minter.mlr");
        protocol.minter.minDebtValue.eq(cfg.params.minter.minDebtValue, "minter.minDebtValue");

        protocol.scdp.MCR.eq(cfg.params.scdp.minCollateralRatio, "scdp.mcr");
        protocol.scdp.LT.eq(cfg.params.scdp.liquidationThreshold, "scdp.lt");
        protocol.scdp.MLR.eq(cfg.params.scdp.liquidationThreshold + 1e2, "scdp.mlr");

        protocol.scdp.totals.valColl.eq(225_000e8, "scdp.totals.valColl");
        protocol.scdp.totals.valCollAdj.eq(225_000e8, "scdp.totals.valCollAdj");
        protocol.scdp.totals.valDebt.eq(0, "scdp.totals.valDebt");
        protocol.scdp.totals.valDebtOg.eq(0, "scdp.totals.valDebtOg");
        protocol.scdp.totals.valDebtOgAdj.eq(0, "scdp.totals.valDebtOgAdj");
        protocol.scdp.totals.cr.eq(type(uint256).max, "scdp.totals.cr");
        protocol.scdp.totals.crOg.eq(type(uint256).max, "scdp.totals.crOg");
        protocol.scdp.totals.crOgAdj.eq(type(uint256).max, "scdp.totals.crOgAdj");

        protocol.scdp.deposits.length.eq(8, "scdp.deposits.length");
        protocol.scdp.deposits[0].addr.eq(address(usdc), "scdp.deposit0.token");
        protocol.scdp.deposits[0].symbol.eq("USDC", "scdp.deposit0.symbol");
        protocol.scdp.deposits[0].price.eq(1e8, "scdp.deposit0.price");
        protocol.scdp.deposits[0].amount.eq(0, "scdp.deposit0.amount");
        protocol.scdp.deposits[0].amountFees.eq(0, "scdp.deposit0.amountFees");
        protocol.scdp.deposits[0].amountSwapDeposit.eq(0, "scdp.deposit0.amountSwapDeposits");
        protocol.scdp.deposits[0].val.eq(0, "scdp.deposit0.val");
        protocol.scdp.deposits[0].valAdj.eq(0, "scdp.deposit0.valAdj");

        protocol.scdp.deposits[1].addr.eq(address(kiss), "scdp.deposit1.token");
        protocol.scdp.deposits[1].symbol.eq("KISS", "scdp.deposit1.symbol");
        protocol.scdp.deposits[1].price.eq(1e8, "scdp.deposit1.price");
        protocol.scdp.deposits[1].amount.eq(225_000e18, "scdp.deposit1.amount");
        protocol.scdp.deposits[1].amountFees.eq(225_000e18, "scdp.deposit1.amountFees");
        protocol.scdp.deposits[1].amountSwapDeposit.eq(0, "scdp.deposit1.amountSwapDeposit");
        protocol.scdp.deposits[1].val.eq(225_000e8, "scdp.deposit1.val");
        protocol.scdp.deposits[1].valAdj.eq(225_000e8, "scdp.deposit1.valAdj");

        protocol.scdp.deposits[2].addr.eq(address(krETH), "scdp.deposit2.token");
        protocol.scdp.deposits[2].symbol.eq("krETH", "scdp.deposit2.symbol");
        protocol.scdp.deposits[2].amount.eq(0, "scdp.deposit2.amount");
        protocol.scdp.deposits[2].amountFees.eq(0, "scdp.deposit2.amountFees");
        protocol.scdp.deposits[2].amountSwapDeposit.eq(0, "scdp.deposit2.amountSwapDeposit");
        protocol.scdp.deposits[2].val.eq(0, "scdp.deposit2.val");
        protocol.scdp.deposits[2].valAdj.eq(0, "scdp.deposit2.valAdj");

        protocol.scdp.deposits[3].addr.eq(address(krBTC), "scdp.deposit3.token");
        protocol.scdp.deposits[3].symbol.eq("krBTC", "scdp.deposit3.symbol");
        protocol.scdp.deposits[3].price.eq(35159e8, "scdp.deposit3.price");
        protocol.scdp.deposits[3].amount.eq(0, "scdp.deposit3.amount");
        protocol.scdp.deposits[3].amountFees.eq(0, "scdp.deposit3.amountFees");
        protocol.scdp.deposits[3].amountSwapDeposit.eq(0, "scdp.deposit3.amountSwapDeposit");
        protocol.scdp.deposits[3].val.eq(0, "scdp.deposit3.val");
        protocol.scdp.deposits[3].valAdj.eq(0, "scdp.deposit3.val");

        protocol.scdp.debts.length.eq(7, "scdp.debts.length");
        protocol.scdp.debts[0].addr.eq(address(kiss), "scdp.debt0.token");
        protocol.scdp.debts[0].symbol.eq("KISS", "scdp.debt0.symbol");
        protocol.scdp.debts[0].price.eq(1e8, "scdp.debt0.val");
        protocol.scdp.debts[0].amount.eq(0, "scdp.debt0.amount");
        protocol.scdp.debts[0].val.eq(0, "scdp.debt0.val");
        protocol.scdp.debts[0].valAdj.eq(0, "scdp.debt0.val");

        protocol.scdp.debts[1].addr.eq(address(krETH), "scdp.debt1.token");
        protocol.scdp.debts[1].symbol.eq("krETH", "scdp.debt1.symbol");
        protocol.scdp.debts[1].price.eq(1911e8, "scdp.debt1.val");
        protocol.scdp.debts[1].amount.eq(0, "scdp.debt1.amount");
        protocol.scdp.debts[1].val.eq(0, "scdp.debt1.val");
        protocol.scdp.debts[1].valAdj.eq(0, "scdp.debt1.val");

        protocol.scdp.debts[2].addr.eq(address(krBTC), "scdp.debt2.token");
        protocol.scdp.debts[2].symbol.eq("krBTC", "scdp.debt2.symbol");
        protocol.scdp.debts[2].price.eq(35159e8, "scdp.debt2.val");
        protocol.scdp.debts[2].amount.eq(0, "scdp.debt2.amount");
        protocol.scdp.debts[2].val.eq(0, "scdp.debt2.val");
        protocol.scdp.debts[2].valAdj.eq(0, "scdp.debt2.val");
    }

    function testUserDatas() public {
        PythView memory prices = getMockPythViewPrices(getConfig("test", "test-base"));
        View.Account memory acc = dataV1.getAccount(prices, user0).protocol;
        acc.addr.eq(user0, "acc.addr");

        acc.bals[0].symbol.eq("WETH", "acc.bals[0].symbol");
        acc.bals[1].symbol.eq("WBTC", "acc.bals[1].symbol");
        acc.bals[2].symbol.eq("USDC", "acc.bals[2].symbol");
        acc.bals[2].val.eq(100_000e8, "acc.bals[2].val");

        acc.minter.deposits.length.eq(ASSET_COUNT, "user0.minter.deposits.length");

        acc.minter.deposits[0].symbol.eq("WETH", "acc.minter.deposits[0].symbol");
        acc.minter.deposits[0].amount.eq(2e18, "acc.minter.deposits[0].amount");
        acc.minter.deposits[0].val.eq(3822e8, "acc.minter.deposits[0].val");
        acc.minter.deposits[0].valAdj.eq(3822e8, "acc.minter.deposits[0].valAdj");

        acc.minter.deposits[1].symbol.eq("WBTC", "acc.minter.deposits[1].symbol");
        acc.minter.deposits[1].amount.eq(0, "acc.minter.deposits[1].amount");
        acc.minter.deposits[1].val.eq(0, "acc.minter.deposits[1].val");

        acc.minter.deposits[2].symbol.eq("USDC", "acc.minter.deposits[2].symbol");
        acc.minter.deposits[2].amount.eq(4000e6, "acc.minter.deposits[2].amount");
        acc.minter.deposits[2].val.eq(4000e8, "acc.minter.deposits[2].val");

        acc.minter.deposits[3].symbol.eq("USDC.e", "acc.minter.deposits[3].symbol");
        acc.minter.deposits[3].amount.eq(0, "acc.minter.deposits[3].amount");
        acc.minter.deposits[3].val.eq(0, "acc.minter.deposits[3].val");

        acc.minter.deposits[4].symbol.eq("USDT", "acc.minter.deposits[4].symbol");
        acc.minter.deposits[4].amount.eq(0, "acc.minter.deposits[4].amount");
        acc.minter.deposits[4].val.eq(0, "acc.minter.deposits[4].val");

        acc.minter.debts.length.eq(6, "acc.minter.deposits.length");

        acc.minter.debts[0].symbol.eq("krETH", "acc.minter.debts[0].symbol");
        acc.minter.debts[0].amount.eq(2.5e18, "acc.minter.debts[0].amount");
        acc.minter.debts[0].val.eq(4777.5e8, "acc.minter.debts[0].val");
        acc.minter.debts[0].valAdj.eq(5016.375e8, "acc.minter.debts[0].valAdj");

        acc.minter.debts[1].symbol.eq("krBTC", "acc.minter.debts[1].symbol");
        acc.minter.debts[1].amount.eq(0, "acc.minter.debts[1].amount");
        acc.minter.debts[1].val.eq(0, "acc.minter.debts[1].val");
        acc.minter.debts[1].valAdj.eq(0, "acc.minter.debts[1].valAdj");

        acc.scdp.deposits.length.eq(2, "acc.scdp.deposits.length");
        acc.scdp.deposits[0].addr.eq(address(usdc), "acc.scdp.deposits[0].token");
        acc.scdp.deposits[0].symbol.eq("USDC", "acc.scdp.deposits[0].symbol");
        acc.scdp.deposits[0].config.decimals.eq(6, "acc.scdp.deposits[0].config.decimals");
        acc.scdp.deposits[0].price.eq(1e8, "acc.scdp.deposits[0].token");
        acc.scdp.deposits[0].amount.eq(0, "acc.scdp.deposits[0].amount");
        acc.scdp.deposits[0].val.eq(0, "acc.scdp.deposits[0].val");
        acc.scdp.deposits[0].valFees.eq(0, "acc.scdp.deposits[0].valFees");

        /* ------------------------------ user2 ----------------------------- */
        View.Account memory acc2 = dataV1.getAccount(prices, user2).protocol;
        acc2.addr.eq(user2, "acc2.addr");

        acc2.minter.deposits.length.eq(ASSET_COUNT, "acc2.minter.deposits.length");

        acc2.minter.deposits[0].symbol.eq("WETH", "acc2.minter.deposits[0].symbol");
        acc2.minter.deposits[0].amount.eq(2e18, "acc2.minter.deposits[0].amount");
        acc2.minter.deposits[0].val.eq(3822e8, "acc2.minter.deposits[0].val");
        acc2.minter.deposits[0].valAdj.eq(3822e8, "acc2.minter.deposits[0].valAdj");

        acc2.minter.deposits[1].symbol.eq("WBTC", "acc2.minter.deposits[1].symbol");
        acc2.minter.deposits[1].amount.eq(0, "acc2.minter.deposits[1].amount");
        acc2.minter.deposits[1].val.eq(0, "acc2.minter.deposits[1].val");

        acc2.minter.deposits[2].symbol.eq("USDC", "acc2.minter.deposits[2].symbol");
        acc2.minter.deposits[2].amount.eq(4000e6, "acc2.minter.deposits[2].amount");
        acc2.minter.deposits[2].val.eq(4000e8, "acc2.minter.deposits[2].val");

        acc2.minter.deposits[3].symbol.eq("USDC.e", "acc2.minter.deposits[3].symbol");
        acc2.minter.deposits[3].amount.eq(0, "acc2.minter.deposits[3].amount");
        acc2.minter.deposits[3].val.eq(0, "acc2.minter.deposits[3].val");

        acc2.minter.deposits[4].symbol.eq("USDT", "acc2.minter.deposits[4].symbol");
        acc2.minter.deposits[4].amount.eq(0, "acc2.minter.deposits[4].amount");
        acc2.minter.deposits[4].val.eq(0, "acc2.minter.deposits[4].val");

        acc2.minter.debts.length.eq(6, "acc2.minter.debts.length");

        acc2.minter.debts[0].symbol.eq("krETH", "acc2.minter.debts[0].symbol");
        acc2.minter.debts[0].amount.eq(1e18, "acc2.minter.debts[0].amount");
        acc2.minter.debts[0].val.eq(1911e8, "acc2.minter.debts[0].val");
        acc2.minter.debts[0].valAdj.eq(2006.55e8, "acc2.minter.debts[0].valAdj");

        acc2.minter.debts[1].symbol.eq("krBTC", "acc2.minter.debts[1].symbol");
        acc2.minter.debts[1].amount.eq(0, "acc2.minter.debts[1].amount");
        acc2.minter.debts[1].val.eq(0, "acc2.minter.debts[1].val");
        acc2.minter.debts[1].valAdj.eq(0, "acc2.minter.debts[1].valAdj");

        acc2.scdp.deposits.length.eq(2, "acc2.scdp.deposits.length");
        acc2.scdp.deposits[0].addr.eq(address(usdc), "acc2.scdp.deposits[0].token");
        acc2.scdp.deposits[0].symbol.eq("USDC", "acc2.scdp.deposits[0].symbol");
        acc2.scdp.deposits[0].price.eq(1e8, "acc2.scdp.deposits[0].token");
        acc2.scdp.deposits[0].amount.eq(0, "acc2.scdp.deposits[0].amount");

        acc2.scdp.deposits[0].val.eq(0, "acc2.scdp.deposits[0].val");
        acc2.scdp.deposits[0].valFees.eq(0, "acc2.scdp.deposits[0].valFees");
    }
}
