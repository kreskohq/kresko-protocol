// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {Help, Log} from "kresko-lib/utils/Libs.sol";
import {TestBase} from "kresko-lib/utils/TestBase.t.sol";
import {KreskoForgeUtils} from "scripts/utils/KreskoForgeUtils.s.sol";
import {DataFacet} from "periphery/facets/DataFacet.sol";
import {PType} from "periphery/PTypes.sol";
import {DataV1} from "periphery/DataV1.sol";
import {Vault} from "vault/Vault.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IDataV1} from "periphery/IDataV1.sol";
import {ms} from "minter/MState.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";

contract PeripheryTest is TestBase("MNEMONIC_DEVNET"), KreskoForgeUtils {
    using ShortAssert for *;
    using Help for *;
    using Log for *;

    MockTokenInfo internal usdc;
    MockTokenInfo internal wbtc;
    MockTokenInfo internal dai;
    KrAssetInfo internal krETH;
    KrAssetInfo internal krJPY;
    KrAssetInfo internal krTSLA;
    DataV1 internal dataV1;
    uint256 constant ASSET_COUNT = 6;
    KrMulticall internal mc;

    string initialPrices = "USDC:1:8,BTC:35179:8,DAI:0.99:8,ETH:2000:8,TSLA:100:8,JPY:0.0067:8";
    bytes redstoneCallData;

    function setUp() public users(address(11), address(22), address(33)) {
        redstoneCallData = getRedstonePayload(initialPrices);

        deployCfg = CoreConfig({
            admin: TEST_ADMIN,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            coverThreshold: 160e2,
            coverIncentive: 1.01e4,
            oraclePrecision: 8,
            staleTime: 86401,
            council: getMockSafe(TEST_ADMIN),
            treasury: TEST_TREASURY
        });

        prank(deployCfg.admin);
        kresko = deployDiamondOneTx(deployCfg);
        factory = deployDeploymentFactory(TEST_ADMIN);
        vm.warp(3601);

        usdc = mockCollateral(
            bytes32("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            ext_full
        );
        dai = mockCollateral(
            bytes32("DAI"),
            MockConfig({symbol: "DAI", price: 0.99e8, setFeeds: true, dec: 18, feedDec: 8}),
            ext_default
        );
        wbtc = mockCollateral(
            bytes32("BTC"),
            MockConfig({symbol: "WBTC", price: 35179e8, setFeeds: true, dec: 8, feedDec: 8}),
            ext_default
        );
        krETH = mockKrAsset(
            bytes32("ETH"),
            address(0),
            MockConfig({symbol: "krETH", price: 2000e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_default,
            deployCfg
        );
        krJPY = mockKrAsset(
            bytes32("JPY"),
            address(0),
            MockConfig({symbol: "krJPY", price: 0.0067e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_default,
            deployCfg
        );
        krTSLA = mockKrAsset(
            bytes32("TSLA"),
            address(0),
            MockConfig({symbol: "krTSLA", price: 100e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_swap_only,
            deployCfg
        );

        usdc.mock.mint(user0, 100e18);
        usdc.mock.mint(user1, 10000e18);
        usdc.mock.mint(user2, 10000e18);
        wbtc.mock.mint(user0, 1e8);
        dai.mock.mint(user2, 10000e18);

        vkiss = new Vault("vKISS", "vKISS", 18, 8, deployCfg.treasury, deployCfg.seqFeed);
        kiss = deployKISS(address(kresko), address(vkiss), deployCfg.admin).kiss;

        vkiss.addAsset(
            VaultAsset(usdc.asToken, IAggregatorV3(address(usdc.feedAddr)), 80000, 0, 0, 0, type(uint248).max, true)
        );
        vkiss.addAsset(VaultAsset(dai.asToken, IAggregatorV3(address(usdc.feedAddr)), 80000, 0, 0, 0, type(uint248).max, true));
        kresko.setFeeAssetSCDP(usdc.addr);
        prank(user0);
        usdc.mock.approve(address(kresko), type(uint256).max);
        wbtc.mock.approve(address(kresko), type(uint256).max);
        kresko.depositCollateral(user0, usdc.addr, 50e18);
        kresko.depositCollateral(user0, wbtc.addr, 0.1e8);
        call(kresko.mintKreskoAsset.selector, user0, krETH.addr, 0.01e18, initialPrices);

        prank(user1);
        usdc.mock.approve(address(kresko), type(uint256).max);
        kresko.depositCollateral(user1, usdc.addr, 5000e18);
        call(kresko.mintKreskoAsset.selector, user1, krETH.addr, 1e18, initialPrices);
        call(kresko.mintKreskoAsset.selector, user1, krJPY.addr, 10000e18, initialPrices);

        prank(user2);
        usdc.mock.approve(address(kresko), type(uint256).max);
        dai.mock.approve(address(kresko), type(uint256).max);
        kresko.depositCollateral(user2, usdc.addr, 5000e18);
        kresko.depositCollateral(user2, dai.addr, 2000e18);

        call(kresko.depositSCDP.selector, user2, usdc.addr, 1000e18, initialPrices);
        call(kresko.mintKreskoAsset.selector, user2, krETH.addr, 1.5e18, initialPrices);

        prank(deployCfg.admin);
        dataV1 = new DataV1(DataFacet(address(kresko)), address(vkiss), address(vkiss));
        mc = new KrMulticall(address(kresko), address(kiss), address(0));
        kresko.grantRole(Role.MANAGER, address(mc));
    }

    function testProtocolDatas() public {
        // (, bytes memory data) = address(dataV1).staticcall(
        //     abi.encodePacked(abi.encodeWithSelector(dataV1.getGlobalsRs.selector), redstoneCallData)
        // );
        // PType.Protocol memory protocol = abi.decode(data, (IDataV1.DGlobal)).protocol;
        PType.Protocol memory protocol = dataV1.getGlobals(redstoneCallData).protocol;
        protocol.maxPriceDeviationPct.eq(5e2, "maxPriceDeviationPct");
        protocol.oracleDecimals.eq(8, "oracleDecimals");
        protocol.staleTime.eq(86401, "staleTime");
        protocol.isSequencerUp.eq(true, "isSequencerUp");
        protocol.safetyStateSet.eq(false, "safetyStateSet");
        protocol.sequencerGracePeriodTime.eq(3600, "sequencerGracePeriodTime");

        protocol.assets.length.eq(ASSET_COUNT, "assets");
        protocol.assets[0].symbol.eq("USDC", "symbol0");
        protocol.assets[0].price.eq(1e8, "price0");

        protocol.assets[1].symbol.eq("DAI", "symbol1");
        protocol.assets[1].price.eq(0.99e8, "price1");

        protocol.assets[2].symbol.eq("WBTC", "symbol2");
        protocol.assets[2].price.eq(35179e8, "price2");

        protocol.assets[3].symbol.eq("krETH", "symbol3");
        protocol.assets[3].price.eq(2000e8, "price3");

        protocol.assets[4].symbol.eq("krJPY", "symbol4");
        protocol.assets[4].price.eq(0.0067e8, "price4");

        protocol.assets[5].symbol.eq("krTSLA", "symbol5");
        protocol.assets[5].price.eq(100e8, "price5");

        protocol.minter.MCR.eq(150e2, "minter.mcr");
        protocol.minter.LT.eq(140e2, "minter.lt");
        protocol.minter.MLR.eq(141e2, "minter.mlr");
        protocol.minter.minDebtValue.eq(10e8, "minter.minDebtValue");

        protocol.scdp.MCR.eq(200e2, "scdp.mcr");
        protocol.scdp.LT.eq(150e2, "scdp.lt");
        protocol.scdp.MLR.eq(151e2, "scdp.mlr");

        protocol.scdp.totals.valColl.eq(1000e8, "scdp.totals.valColl");
        protocol.scdp.totals.valCollAdj.eq(1000e8, "scdp.totals.valCollAdj");
        protocol.scdp.totals.valDebt.eq(0, "scdp.totals.valDebt");
        protocol.scdp.totals.valDebtOg.eq(0, "scdp.totals.valDebtOg");
        protocol.scdp.totals.valDebtOgAdj.eq(0, "scdp.totals.valDebtOgAdj");
        protocol.scdp.totals.cr.eq(type(uint256).max, "scdp.totals.cr");
        protocol.scdp.totals.crOg.eq(type(uint256).max, "scdp.totals.crOg");
        protocol.scdp.totals.crOgAdj.eq(type(uint256).max, "scdp.totals.crOgAdj");

        protocol.scdp.deposits.length.eq(4, "scdp.deposits.length");
        protocol.scdp.deposits[0].addr.eq(usdc.addr, "scdp.deposit0.token");
        protocol.scdp.deposits[0].symbol.eq("USDC", "scdp.deposit0.symbol");
        protocol.scdp.deposits[0].price.eq(1e8, "scdp.deposit0.token");
        protocol.scdp.deposits[0].amount.eq(1000e18, "scdp.deposit0.amount");
        protocol.scdp.deposits[0].amountFees.eq(1000e18, "scdp.deposit0.amountFees");
        protocol.scdp.deposits[0].amountSwapDeposit.eq(0, "scdp.deposit0.amountSwapDeposits");
        protocol.scdp.deposits[0].val.eq(1000e8, "scdp.deposit0.val");
        protocol.scdp.deposits[0].valAdj.eq(1000e8, "scdp.deposit0.val");

        protocol.scdp.deposits[1].addr.eq(krETH.addr, "scdp.deposit1.token");
        protocol.scdp.deposits[1].symbol.eq("krETH", "scdp.deposit1.symbol");
        protocol.scdp.deposits[1].price.eq(2000e8, "scdp.deposit1.token");
        protocol.scdp.deposits[1].amount.eq(0, "scdp.deposit1.amount");
        protocol.scdp.deposits[1].amountFees.eq(0, "scdp.deposit1.amountFees");
        protocol.scdp.deposits[1].amountSwapDeposit.eq(0, "scdp.deposit1.amountSwapDeposit");
        protocol.scdp.deposits[1].val.eq(0, "scdp.deposit1.val");
        protocol.scdp.deposits[1].valAdj.eq(0, "scdp.deposit1.val");

        protocol.scdp.deposits[2].addr.eq(krJPY.addr, "scdp.deposit2.token");
        protocol.scdp.deposits[2].symbol.eq("krJPY", "scdp.deposit2.symbol");
        protocol.scdp.deposits[2].amount.eq(0, "scdp.deposit2.amount");
        protocol.scdp.deposits[2].amountFees.eq(0, "scdp.deposit2.amountFees");
        protocol.scdp.deposits[2].amountSwapDeposit.eq(0, "scdp.deposit2.amountSwapDeposit");
        protocol.scdp.deposits[2].val.eq(0, "scdp.deposit2.val");
        protocol.scdp.deposits[2].valAdj.eq(0, "scdp.deposit2.val");

        protocol.scdp.deposits[3].addr.eq(krTSLA.addr, "scdp.deposit3.token");
        protocol.scdp.deposits[3].symbol.eq("krTSLA", "scdp.deposit3.symbol");
        protocol.scdp.deposits[3].price.eq(100e8, "scdp.deposit3.token");
        protocol.scdp.deposits[3].amount.eq(0, "scdp.deposit3.amount");
        protocol.scdp.deposits[3].amountFees.eq(0, "scdp.deposit3.amountFees");
        protocol.scdp.deposits[3].amountSwapDeposit.eq(0, "scdp.deposit3.amountSwapDeposit");
        protocol.scdp.deposits[3].val.eq(0, "scdp.deposit3.val");
        protocol.scdp.deposits[3].valAdj.eq(0, "scdp.deposit3.val");

        protocol.scdp.debts.length.eq(3, "scdp.debts.length");
        protocol.scdp.debts[0].addr.eq(krETH.addr, "scdp.debt0.token");
        protocol.scdp.debts[0].symbol.eq("krETH", "scdp.debt0.symbol");
        protocol.scdp.debts[0].price.eq(2000e8, "scdp.debt0.val");
        protocol.scdp.debts[0].amount.eq(0, "scdp.debt0.amount");
        protocol.scdp.debts[0].val.eq(0, "scdp.debt0.val");
        protocol.scdp.debts[0].valAdj.eq(0, "scdp.debt0.val");

        protocol.scdp.debts[1].addr.eq(krJPY.addr, "scdp.debt1.token");
        protocol.scdp.debts[1].symbol.eq("krJPY", "scdp.debt1.symbol");
        protocol.scdp.debts[1].price.eq(0.0067e8, "scdp.debt1.val");
        protocol.scdp.debts[1].amount.eq(0, "scdp.debt1.amount");
        protocol.scdp.debts[1].val.eq(0, "scdp.debt1.val");
        protocol.scdp.debts[1].valAdj.eq(0, "scdp.debt1.val");

        protocol.scdp.debts[2].addr.eq(krTSLA.addr, "scdp.debt2.token");
        protocol.scdp.debts[2].symbol.eq("krTSLA", "scdp.debt2.symbol");
        protocol.scdp.debts[2].price.eq(100e8, "scdp.debt2.val");
        protocol.scdp.debts[2].amount.eq(0, "scdp.debt2.amount");
        protocol.scdp.debts[2].val.eq(0, "scdp.debt2.val");
        protocol.scdp.debts[2].valAdj.eq(0, "scdp.debt2.val");
    }

    function testUserDatas() public {
        /* ------------------------------ user0 ----------------------------- */
        // (, bytes memory data) = address(dataV1).staticcall(
        //     abi.encodePacked(abi.encodeWithSelector(dataV1.getAccountRs.selector, user0), redstoneCallData)
        // );
        // PType.Account memory account = abi.decode(data, (IDataV1.DAccount)).protocol;
        PType.Account memory account = dataV1.getAccount(user0, redstoneCallData).protocol;
        account.addr.eq(user0, "account.addr");

        account.bals[0].symbol.eq("USDC", "account.bals[0].symbol");
        account.bals[1].symbol.eq("DAI", "account.bals[1].symbol");
        account.bals[2].symbol.eq("WBTC", "account.bals[2].symbol");
        account.bals[2].val.eq(3166110000000, "account.bals[2].val");

        account.minter.deposits.length.eq(5, "user0.minter.deposits.length");

        account.minter.deposits[0].symbol.eq("USDC", "account0.minter.deposits[0].symbol");
        account.minter.deposits[0].amount.eq(50e18, "account0.minter.deposits[0].amount");
        account.minter.deposits[0].val.eq(50e8, "account0.minter.deposits[0].val");
        account.minter.deposits[0].valAdj.eq(50e8, "account0.minter.deposits[0].valAdj");

        account.minter.deposits[1].symbol.eq("DAI", "account0.minter.deposits[1].symbol");
        account.minter.deposits[1].amount.eq(0, "account0.minter.deposits[1].amount");
        account.minter.deposits[1].val.eq(0, "account0.minter.deposits[1].val");

        account.minter.deposits[2].symbol.eq("WBTC", "account0.minter.deposits[2].symbol");
        account.minter.deposits[2].amount.eq(9998863, "account0.minter.deposits[2].amount");
        account.minter.deposits[2].val.eq(351750001477, "account0.minter.deposits[2].val");

        account.minter.deposits[3].symbol.eq("krETH", "account0.minter.deposits[3].symbol");
        account.minter.deposits[3].amount.eq(0, "account0.minter.deposits[3].amount");
        account.minter.deposits[3].val.eq(0, "account0.minter.deposits[3].val");

        account.minter.deposits[4].symbol.eq("krJPY", "account0.minter.deposits[4].symbol");
        account.minter.deposits[4].amount.eq(0, "account0.minter.deposits[4].amount");
        account.minter.deposits[4].val.eq(0, "account0.minter.deposits[4].val");

        account.minter.debts.length.eq(2, "account0.minter.deposits.length");

        account.minter.debts[0].symbol.eq("krETH", "account0.minter.debts[0].symbol");
        account.minter.debts[0].amount.eq(0.01e18, "account0.minter.debts[0].amount");
        account.minter.debts[0].val.eq(20e8, "account0.minter.debts[0].val");
        account.minter.debts[0].valAdj.eq(24e8, "account0.minter.debts[0].valAdj");

        account.minter.debts[1].symbol.eq("krJPY", "account0.minter.debts[1].symbol");
        account.minter.debts[1].amount.eq(0, "account0.minter.debts[1].amount");
        account.minter.debts[1].val.eq(0, "account0.minter.debts[1].val");
        account.minter.debts[1].valAdj.eq(0, "account0.minter.debts[1].valAdj");

        account.scdp.deposits.length.eq(1, "account0.scdp.deposits.length");
        account.scdp.deposits[0].addr.eq(usdc.addr, "account0.scdp.deposits[0].token");
        account.scdp.deposits[0].symbol.eq("USDC", "account0.scdp.deposits[0].symbol");
        account.scdp.deposits[0].config.decimals.eq(18, "account0.scdp.deposits[0].config.decimals");
        account.scdp.deposits[0].price.eq(1e8, "account0.scdp.deposits[0].token");
        account.scdp.deposits[0].amount.eq(0, "account0.scdp.deposits[0].amount");
        account.scdp.deposits[0].val.eq(0, "account0.scdp.deposits[0].val");
        account.scdp.deposits[0].valFees.eq(0, "account0.scdp.deposits[0].valFees");

        /* ------------------------------ user2 ----------------------------- */
        PType.Account memory account2 = dataV1.getAccount(user2, redstoneCallData).protocol;
        account2.addr.eq(user2, "account2.addr");

        account2.minter.deposits.length.eq(5, "account2.minter.deposits.length");

        account2.minter.deposits[0].symbol.eq("USDC", "account2.minter.deposits[0].symbol");
        account2.minter.deposits[0].amount.eq(5000e18, "account2.minter.deposits[0].amount");
        account2.minter.deposits[0].val.eq(5000e8, "account2.minter.deposits[0].val");
        account2.minter.deposits[0].valAdj.eq(5000e8, "account2.minter.deposits[0].valAdj");

        account2.minter.deposits[1].symbol.eq("DAI", "account2.minter.deposits[1].symbol");
        account2.minter.deposits[1].amount.gt(1900e18, "account2.minter.deposits[1].amount");
        account2.minter.deposits[1].val.gt(1900e8, "account2.minter.deposits[1].val");

        account2.minter.deposits[2].symbol.eq("WBTC", "account2.minter.deposits[2].symbol");
        account2.minter.deposits[2].amount.eq(0, "account2.minter.deposits[2].amount");
        account2.minter.deposits[2].val.eq(0, "account2.minter.deposits[2].val");

        account2.minter.deposits[3].symbol.eq("krETH", "account2.minter.deposits[3].symbol");
        account2.minter.deposits[3].amount.eq(0, "account2.minter.deposits[3].amount");
        account2.minter.deposits[3].val.eq(0, "account2.minter.deposits[3].val");

        account2.minter.deposits[4].symbol.eq("krJPY", "account2.minter.deposits[4].symbol");
        account2.minter.deposits[4].amount.eq(0, "account2.minter.deposits[4].amount");
        account2.minter.deposits[4].val.eq(0, "account2.minter.deposits[4].val");

        account2.minter.debts.length.eq(2, "account2.minter.deposits.length");

        account2.minter.debts[0].symbol.eq("krETH", "account2.minter.debts[0].symbol");
        account2.minter.debts[0].amount.eq(1.5e18, "account2.minter.debts[0].amount");
        account2.minter.debts[0].val.eq(3000e8, "account2.minter.debts[0].val");
        account2.minter.debts[0].valAdj.eq(3600e8, "account2.minter.debts[0].valAdj");

        account2.minter.debts[1].symbol.eq("krJPY", "account2.minter.debts[1].symbol");
        account2.minter.debts[1].amount.eq(0, "account2.minter.debts[1].amount");
        account2.minter.debts[1].val.eq(0, "account2.minter.debts[1].val");
        account2.minter.debts[1].valAdj.eq(0, "account2.minter.debts[1].valAdj");

        account2.scdp.deposits.length.eq(1, "account2.scdp.deposits.length");
        account2.scdp.deposits[0].addr.eq(usdc.addr, "account2.scdp.deposits[0].token");
        account2.scdp.deposits[0].symbol.eq("USDC", "account2.scdp.deposits[0].symbol");
        account2.scdp.deposits[0].price.eq(1e8, "account2.scdp.deposits[0].token");
        account2.scdp.deposits[0].amount.eq(1000e18, "account2.scdp.deposits[0].amount");

        account2.scdp.deposits[0].val.eq(1000e8, "account2.scdp.deposits[0].val");
        account2.scdp.deposits[0].valFees.eq(0, "account2.scdp.deposits[0].valFees");
    }
}
