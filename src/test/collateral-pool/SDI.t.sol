// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {console} from "forge-std/Test.sol";
import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {LibTest} from "kresko-helpers/utils/LibTest.sol";
import {TestBase} from "kresko-helpers/utils/TestBase.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {SDI, Asset} from "scdp/SDI/SDI.sol";
import {MockOracle} from "test/MockOracle.sol";
import {MockERC20, WETH} from "test/MockERC20.sol";

contract SDITest is TestBase {
    using LibTest for *;

    address internal user0 = address(121212);
    address internal user1 = address(21212);
    address internal user2 = address(21412);

    uint256 internal constant PERCENT = 0.01e18;
    ISCDPStateFacet internal kresko;
    SDI internal sdi;

    MockERC20 internal btc;
    MockERC20 internal weth;
    MockERC20 internal kiss;
    MockERC20 internal krETH;
    MockERC20 internal krJPY;

    MockOracle internal kissOracle;
    MockOracle internal btcOracle;
    MockOracle internal ethOracle;
    MockOracle internal jpyOracle;

    address internal feeRecipient = address(0xFEE);

    function setUp() public {
        // tokens
        weth = new WETH();
        btc = new MockERC20("BTC", "BTC", 8);
        kiss = new MockERC20("KISS", "KISS", 18);
        krETH = new MockERC20("krETH", "krETH", 18);
        krJPY = new MockERC20("krJPY", "krJPY", 18);

        // oracles
        btcOracle = new MockOracle(30000e8);
        ethOracle = new MockOracle(2000e8);
        kissOracle = new MockOracle(1e8);
        jpyOracle = new MockOracle(0.1e8);

        address[] memory tokensKresko = new address[](3);
        tokensKresko[0] = address(kiss);
        tokensKresko[1] = address(krETH);
        tokensKresko[2] = address(krJPY);

        address[] memory oraclesKresko = new address[](3);
        oraclesKresko[0] = address(kissOracle);
        oraclesKresko[1] = address(ethOracle);
        oraclesKresko[2] = address(jpyOracle);

        address[] memory oraclesSDI = new address[](5);
        oraclesSDI[0] = address(kissOracle);
        oraclesSDI[1] = address(btcOracle);
        oraclesSDI[2] = address(ethOracle);
        oraclesSDI[3] = address(ethOracle);
        oraclesSDI[4] = address(jpyOracle);

        address[] memory tokensSDI = new address[](5);
        tokensSDI[0] = address(kiss);
        tokensSDI[1] = address(btc);
        tokensSDI[2] = address(weth);
        tokensSDI[3] = address(krETH);
        tokensSDI[4] = address(krJPY);

        kresko = new MiniKresko(tokensKresko, oraclesKresko);
        sdi = new SDI(address(kresko), 8, feeRecipient);

        for (uint256 i; i < tokensSDI.length; i++) {
            sdi.addAsset(
                Asset(
                    MockERC20(tokensSDI[i]),
                    AggregatorV3Interface(address(oraclesSDI[i])),
                    type(uint256).max,
                    0,
                    0,
                    true
                )
            );
        }

        kresko.setSDI(address(sdi));

        _approvals();
    }

    function testMint() public prankAddr(user1) {
        (uint256 deposits, uint256 debt) = initSCDP(200 * PERCENT);
        kresko.getCR.equals(200e16).and(sdi.price).equals(1e8);

        kresko.getTotalPoolKrAssetValue.equals(debt);
        kresko.getTotalPoolCollateralValue.equals(deposits);
        sdi.totalSupply.and(sdi.effectiveDebt).equals(debt * 10 ** 10);

        logSimple("testMint");
    }

    function testBurn1() public prankAddr(user1) {
        (, uint256 debt) = initSCDP(200 * PERCENT);

        uint256 burnAmount = 1000e18;
        uint256 tSupplyBefore = sdi.totalSupply();
        kresko.burnKreskoAsset(address(kiss), burnAmount);

        sdi.totalSupply.equals(tSupplyBefore - burnAmount, "debt should be reduced");
        sdi.effectiveDebt.equals(sdi.totalSupply);

        kresko.getCR.equals(250e16);

        logSimple("testBurn");
    }

    function testDebtValueUp() public prankAddr(user1) {
        (, uint256 initialDebt) = initSCDP(200 * PERCENT);
        uint256 tSupplyBefore = sdi.totalSupply();
        uint256 effectiveDebtBefore = sdi.effectiveDebt();

        ethOracle.setPrice(3000e8);
        kresko.getCR().closeTo(166.6e16, 1e15, "pool cr should be 125%");

        uint256 newDebtValue = initialDebt + 1000e8;
        kresko.getTotalPoolKrAssetValue.equals(newDebtValue);
        kresko.getDebtValue.equals(newDebtValue);

        sdi.totalSupply.equals(tSupplyBefore, "total supply should not change");
        sdi.effectiveDebt.equals(effectiveDebtBefore, "effective debt should not change");

        sdi.price.equals((newDebtValue * 1e8) / initialDebt);
        logSimple();
    }

    function testDebtValueDown() public prankAddr(user1) {
        (, uint256 initialDebt) = initSCDP(200 * PERCENT);
        kresko.getCR.equals(200e16);

        uint256 tSupplyBefore = sdi.totalSupply();
        uint256 effectiveDebtBefore = sdi.effectiveDebt();

        ethOracle.setPrice(1000e8);
        uint256 newDebtValue = initialDebt - 1000e8;
        kresko.getCR.equals(250e16, "pool cr should be 250%");

        kresko.getTotalPoolKrAssetValue.equals(newDebtValue);
        kresko.getDebtValue.equals(newDebtValue);

        sdi.totalSupply.equals(tSupplyBefore, "total supply should not change");
        sdi.effectiveDebt.equals(effectiveDebtBefore, "effective debt should not change");

        sdi.price.equals((newDebtValue * 1e8) / initialDebt);
        logSimple();
    }

    function testWipeDebt() public prankAddr(user1) {
        initSCDP(200 * PERCENT);
        repayAll(user1);

        kresko.getTotalPoolKrAssetValue.equals(0, "no debt value should remain");
        sdi.price.equals(1e8);
        sdi.totalSupply.and(sdi.effectiveDebt).equals(0, "debt should be wiped");
        sdi.totalKrAssetDebtUSD.equals(0, "debt should be wiped");
        logSimple("wipeDebt");
    }

    function testCoveringDebt1() public prankAddr(user1) {
        (, uint256 debtValue) = initSCDP(200 * PERCENT);

        btc.mint(user1, 1e8);
        sdi.cover(address(btc), 1e8);

        uint256 BTC_VALUE_START = (1e8 * btcOracle.price()) / 1e8;

        sdi.totalKrAssetDebtUSD.equals(debtValue);

        sdi.effectiveDebt.and(kresko.getDebtValue).equals(0, "debt should be covered");

        sdi.price.equals(1e8, "sdi price should not change");
        sdi.totalDebt.equalsInt(debtValue * 10 ** 10, "debt value should not change");
        sdi.totalCover.equalsInt(BTC_VALUE_START * 10 ** 10, "cover should be btc value");
        sdi.totalCoverUSD.equals(BTC_VALUE_START, "cover value should be btc value");
        sdi.totalSupply.equals((debtValue + BTC_VALUE_START) * 10 ** 10, "total supply should be debt + cover");

        btcOracle.setPrice(4000e8);

        uint256 BTC_VALUE_END = (1e8 * btcOracle.price()) / 1e8;

        sdi.totalCover.equalsInt(BTC_VALUE_START * 10 ** 10, "cover should not change with price");
        sdi.totalCoverUSD.equals(BTC_VALUE_END, "cover value should change with price");
        sdi.totalSupply.equals((debtValue + BTC_VALUE_START) * 10 ** 10, "total supply should be debt + cover");

        sdi.price.equals(
            ((debtValue + BTC_VALUE_END) * 1e8) / (debtValue + BTC_VALUE_START),
            "sdi price should change with price"
        );

        logSimple("cover");
    }

    function testLiquidate() public {
        uint256 liquidationAmount = 1000e18;

        vm.startPrank(user1);

        (, uint256 debtValue) = initSCDP(kresko.LIQ_THRESHOLD() - (PERCENT * 10));
        uint256 crBefore = kresko.getCR();
        uint256 debtBefore = sdi.effectiveDebt();

        crBefore.closeTo(140e16, 1e15, "cr should be 140%");

        vm.stopPrank();

        // this technically same as a flashloan eg. DAI -> acquire KISS from KISSVault
        vm.startPrank(user2);

        kiss.mint(user2, liquidationAmount);
        logSimple("before liquidation");
        uint256 seizedCollateral = kresko.liquidate(address(kiss), liquidationAmount, address(kiss)); // liquidate KISS debt, seize KISS collateral
        logSimple("after liquidation");

        vm.stopPrank();

        seizedCollateral.isGt(liquidationAmount, "incentive not right"); // incentive
        sdi.effectiveDebt().lt(debtBefore, "debt should be reduced");
        kresko.getCR().isGt(crBefore, "cr should be increased");
        kresko.isLiquidatable().equals(false);
    }

    function testLiquidateAfterVoluntaryCover() public {
        vm.startPrank(user1);
        (, uint256 debtValue) = initSCDP(kresko.LIQ_THRESHOLD() - (PERCENT * 10));
        uint256 crBefore = kresko.getCR();
        uint256 liquidationAmount = 1000e18;

        btc.mint(user1, 0.1e8);
        sdi.cover(address(btc), 0.1e8);
        vm.stopPrank();

        vm.startPrank(user2);
        kiss.mint(user2, liquidationAmount);

        // Cannot liquidate, cover increased CR!
        vm.expectRevert();
        kresko.liquidate(address(kiss), liquidationAmount, address(kiss));

        // Increase debt value, liquidatable again
        ethOracle.setPrice(7_000e8); // 2k -> 7k

        // Liquidate
        uint256 seizedCollateral = kresko.liquidate(address(kiss), liquidationAmount, address(kiss)); // liquidate KISS debt, seize KISS collateral
        vm.stopPrank();

        seizedCollateral.isGt(liquidationAmount); // incentive
        kresko.getCR().isGt(crBefore, "cr should be increased");

        kresko.isLiquidatable().equals(false);
    }

    function testLiquidateWithCover() public {
        uint256 liquidationAmount = 1000e18;

        vm.startPrank(user1);

        (, uint256 debtValue) = initSCDP(kresko.LIQ_THRESHOLD() - (PERCENT * 10));
        uint256 crBefore = kresko.getCR();
        uint256 debtBefore = sdi.effectiveDebt();

        crBefore.closeTo(140e16, 1e14);

        vm.stopPrank();

        // this technically same as a flashloan eg. DAI -> acquire KISS from KISSVault
        vm.startPrank(user2);

        kiss.mint(user2, liquidationAmount);
        logSimple("before liquidation");
        uint256 seizedCollateral = kresko.coverLiquidate(address(kiss), liquidationAmount, address(kiss)); // liquidate KISS debt, seize KISS collateral
        logSimple("after liquidation");

        vm.stopPrank();

        seizedCollateral.isGt(liquidationAmount); // incentive
        sdi.effectiveDebt().lt(debtBefore, "debt should be reduced");
        kresko.getCR().isGt(crBefore, "cr should be increased");
        kresko.isLiquidatable().equals(false);
    }

    // function testMiscStuff() public prankAddr(user1) {
    //   uint256 coverAmount = 10000e18;
    //   kiss.mint(user1, coverAmount);
    //   coverAmount.clg('Cover With KISS');
    //   sdi.cover(address(kiss), coverAmount);

    //   uint256 collateralAmount = 4000e18;
    //   kiss.mint(user1, collateralAmount);
    //   kresko.depositCollateral(address(kiss), collateralAmount);

    //   uint256 mintAmount = 1e18;
    //   kresko.mintKreskoAsset(address(krETH), mintAmount);
    //   logSimple('Setup');

    //   kiss.mint(user1, coverAmount);
    //   coverAmount.clg('Cover With KISS');
    //   sdi.cover(address(kiss), coverAmount);
    //   logSimple('Cover KISS');

    //   uint256 coverAmountBTC = 0.33333333e8;
    //   btc.mint(user1, coverAmountBTC);

    //   coverAmountBTC.clg('Cover With BTC', 8);
    //   sdi.cover(address(btc), coverAmountBTC);
    //   logSimple('Cover: BTC');

    //   uint256 newEthPrice = 1000e8;
    //   newEthPrice.clg('ETH to $', 8);
    //   ethOracle.setPrice(newEthPrice);
    //   logSimple('krETH: +50%');

    //   uint256 newBtcPrice = 100_000e8;
    //   newBtcPrice.clg('BTC to $', 8);
    //   btcOracle.setPrice(newBtcPrice);
    //   logSimple('BTC: +300%');

    //   mintAmount.clg('Burning krETH');
    //   kresko.burnKreskoAsset(address(krETH), mintAmount);
    //   logSimple('krETH: Burned');

    //   uint256 newEthPrice2 = 2300e8;
    //   newEthPrice2.clg('ETH to $', 8);
    //   ethOracle.setPrice(newEthPrice2);
    //   logSimple('krETH: +50%');

    //   uint256 newBtcPrice2 = 50_000e8;
    //   newBtcPrice2.clg('BTC to $', 8);
    //   btcOracle.setPrice(newBtcPrice2);
    //   logSimple('BTC: -50%');

    //   mintAmount.clg('minting krETH');
    //   kresko.mintKreskoAsset(address(krETH), mintAmount);
    //   logSimple('krETH: Minted');
    // }

    /* -------------------------------------------------------------------------- */
    /*                                   Helpers                                  */
    /* -------------------------------------------------------------------------- */

    function initSCDP(uint256 cr) internal returns (uint256 deposits, uint256 debt) {
        uint256 depositValueWad = 10000e18;
        uint256 collateralAmount = (depositValueWad * 1e8) / kissOracle.price();
        kiss.mint(user1, depositValueWad);
        kresko.depositCollateral(address(kiss), collateralAmount);

        uint256 mintValue = (depositValueWad * 1e18) / cr;
        uint256 tenth = mintValue / 10;

        uint256 kissAmount = (tenth * 4 * 1e8) / kissOracle.price();
        uint256 krETHAmount = (tenth * 4 * 1e8) / ethOracle.price();
        uint256 krJPYAmount = (tenth * 2 * 1e8) / jpyOracle.price();

        kresko.mintKreskoAsset(address(kiss), kissAmount);
        kresko.mintKreskoAsset(address(krJPY), krJPYAmount);
        kresko.mintKreskoAsset(address(krETH), krETHAmount);

        uint256 oracleConversion = 10 ** (18 - kresko.oracleDecimals());
        return (depositValueWad / oracleConversion, mintValue / oracleConversion);
    }

    function repayAll(address user) internal {
        kresko.burnKreskoAsset(address(kiss), kiss.balanceOf(user));
        kresko.burnKreskoAsset(address(krJPY), krJPY.balanceOf(user));
        kresko.burnKreskoAsset(address(krETH), krETH.balanceOf(user));
    }

    function _approvals() internal {
        _approveAll(user0);
        _approveAll(user1);
        _approveAll(user2);
    }

    function _approveAll(address user) internal {
        vm.startPrank(user);
        kiss.approve(address(sdi), type(uint256).max);
        krJPY.approve(address(sdi), type(uint256).max);
        krETH.approve(address(sdi), type(uint256).max);
        btc.approve(address(sdi), type(uint256).max);
        weth.approve(address(sdi), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        krJPY.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        btc.approve(address(kresko), type(uint256).max);
        weth.approve(address(kresko), type(uint256).max);
        vm.stopPrank();
    }

    function logSimple() internal {
        logSimple("");
    }

    function logSimple(string memory prefix) internal {
        prefix = prefix.and(" | ");
        prefix.and("*****************").clg();
        sdi.totalSupply().clg(prefix.and("SDI totalSupply"));
        sdi.totalDebt().clg(prefix.and("SDI Debt"));
        ((uint256(sdi.totalDebt()) * sdi.price()) / 1e18).clg(prefix.and("SDI Debt USD"), 8);
        sdi.totalKrAssetDebtUSD().clg(prefix.and("SCDP KrAssets USD"), 8);
        sdi.totalCover().clg(prefix.and("SDI Cover"));
        ((uint256(sdi.totalCover()) * sdi.price()) / 1e18).clg(prefix.and("SDI Cover USD"), 8);
        sdi.totalCoverUSD().clg(prefix.and("SDI CoverAssets USD"), 8);
        sdi.price().clg(prefix.and("SDI Price"), 8);
        kresko.getTotalPoolCollateralValue().clg(prefix.and("SCDP Collateral USD"), 8);
        sdi.effectiveDebt().clg(prefix.and("SCDP Effective Debt"));
        kresko.getDebtValue().clg(prefix.and("SCDP Effective Debt USD"), 8);
        kresko.getCR().clg(prefix.and("KR pool CR"), 16);
    }
}
