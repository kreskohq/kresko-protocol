// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {console} from "forge-std/Test.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {IKresko} from "common/IKresko.sol";
import {LibTest} from "kresko-helpers/utils/LibTest.sol";
import {TestBase} from "kresko-helpers/utils/TestBase.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {MockOracle} from "test/MockOracle.sol";
import {MockERC20, WETH} from "test/MockERC20.sol";
import {DeployHelper} from "./utils/DeployHelper.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";
import {MockSequencerUptimeFeed} from "test/MockSequencerUptimeFeed.sol";

contract SDITest is TestBase("MNEMONIC_TESTNET"), DeployHelper {
    using LibTest for *;
    address internal admin = address(0xABABAB);

    MockERC20 internal usdc;
    KreskoAsset internal KISS;
    KreskoAsset internal krETH;
    KreskoAsset internal krJPY;
    KreskoAssetAnchor internal aKISS;
    KreskoAssetAnchor internal akrETH;
    KreskoAssetAnchor internal akrJPY;

    MockOracle internal usdcOracle;
    MockOracle internal ethOracle;
    MockOracle internal jpyOracle;
    MockOracle internal kissOracle;

    string usdcPrice = "USDC:1:8";
    string ethPrice = "ETH:2000:8";
    string jpyPrice = "JPY:1:8";
    string kissPrice = "KISS:1:8";
    string initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8";

    function setUp() public users(address(11), address(22), address(33)) {
        vm.startPrank(admin);
        deployDiamond(admin, address(new MockSequencerUptimeFeed()));
        vm.warp(3602);
        (usdc, usdcOracle) = deployAndWhitelistCollateral("USDC", bytes32("USDC"), 18, 1e8);
        (KISS, aKISS, kissOracle) = deployAndWhitelistKrAsset("KISS", bytes32("KISS"), admin, 1e8);
        (krETH, akrETH, ethOracle) = deployAndWhitelistKrAsset("krETH", bytes32("ETH"), admin, 2000e8);
        (krJPY, akrJPY, jpyOracle) = deployAndWhitelistKrAsset("krJPY", bytes32("JPY"), admin, 1e8);

        kresko.setSCDPFeeAsset(address(KISS));

        whitelistCollateral(address(KISS), address(aKISS), address(kissOracle), bytes32("KISS"));
        enableSCDPCollateral(address(usdc), initialPrices);
        enableSCDPCollateral(address(KISS), initialPrices);
        enableSCDPKrAsset(address(krETH), initialPrices);
        enableSCDPKrAsset(address(krJPY), initialPrices);
        enableSCDPKrAsset(address(KISS), initialPrices);
        enableSwapBothWays(address(KISS), address(krETH), true);
        enableSwapBothWays(address(krJPY), address(krETH), true);
        kresko.addAssetSDI(address(KISS), address(kissOracle), bytes32("KISS"));
        vm.stopPrank();
        _approvals(user0);
        _approvals(user1);
        _approvals(user2);
    }

    function testSetup() public {
        staticCall(kresko.getEffectiveSDIDebt.selector, initialPrices).equals(0, "debt should be 0");
        staticCall(kresko.totalSDI.selector, initialPrices).equals(0, "total supply should be 0");
        kresko.getSDICoverAsset(address(KISS)).enabled.equals(true);
    }

    function testDeposit() public {
        uint256 amount = 1000e18;
        poolDeposit(user0, address(usdc), amount, initialPrices);
        staticCall(kresko.totalSDI.selector, initialPrices).equals(0, "total supply should be 0");
        usdc.balanceOf(address(kresko)).equals(amount);

        staticCall(kresko.getPoolCollateralValue.selector, true, initialPrices).equals(1000e8);
    }

    function testWithdraw() public {
        poolDeposit(user0, address(usdc), 1000e18, initialPrices);
        poolWithdraw(user0, address(usdc), 1000e18, initialPrices);
        staticCall(kresko.getPoolCollateralValue.selector, true, initialPrices).equals(0);
    }

    function testSwap() public {
        uint256 depositAmount = 10000e18;
        uint256 borrowAmount = 1000e18;
        uint256 swapAmount = 1000e18;

        usdc.mint(user0, depositAmount);
        usdc.mint(user1, depositAmount);
        poolDeposit(user0, address(usdc), depositAmount, initialPrices);

        vm.startPrank(user1);
        kresko.depositCollateral(user1, address(usdc), depositAmount);
        call(kresko.mintKreskoAsset.selector, user1, address(KISS), borrowAmount, initialPrices);
        vm.stopPrank();

        swap(user1, address(KISS), swapAmount, address(krETH), initialPrices);

        logSimple("testSwap");
    }

    function testCover() public {
        vm.startPrank(user0);
        initSCDPETH();
        logSimple("#1 Init: $15,000 collateral | Swap $5,000 KISS -> krETH");

        staticCall(kresko.getEffectiveSDIDebt.selector, initialPrices).equals(5940e18);
        kresko.getTotalSDIDebt.equals(5940e18, "total-debt");

        changePrank(user1);
        mintKISS(user1, 1000e18);
        cover(address(KISS), 1000e18, initialPrices);

        uint256 totalCoverBefore = staticCall(kresko.getSDICoverAmount.selector, initialPrices);
        totalCoverBefore.equals(1000e18, "total-cover-before");

        kresko.getTotalSDIDebt.equals(5940e18, "total-debt");
        staticCall(kresko.getEffectiveSDIDebt.selector, initialPrices).equals(4940e18);
        staticCall(kresko.getSDIPrice.selector, initialPrices).equals(1e8, "sdi-price");

        logSimple("#2 Cover 1000 KISS ($1,000)");

        ethOracle.setPrice(2666e8);
        string memory newPrices = "USDC:1:8,ETH:2666:8,JPY:1:8,KISS:1:8";

        uint256 totalCoverAfter = staticCall(kresko.getSDICoverAmount.selector, newPrices);

        totalCoverAfter.lt(totalCoverBefore, "total-cover-after");

        logSimple("#3 krETH price up to: $2,666", newPrices);

        changePrank(user0);
        call(kresko.swap.selector, user0, address(krETH), address(KISS), krETH.balanceOf(user0), 0, newPrices);
        logSimple("#4 1 krETH debt repaid", newPrices);
    }

    function testGas() public prankAddr(user0) {
        uint256 depositValueWad = 20000e18;
        mintKISS(user0, depositValueWad);
        bool success;

        bytes memory redstonePayload = getRedstonePayload(initialPrices);

        uint256 scdpDepositAmount = depositValueWad / 2;
        uint256 swapValueWad = ((scdpDepositAmount / 2) * 1e8) / kissOracle.price();

        bytes memory depositData = abi.encodePacked(
            abi.encodeWithSelector(kresko.poolDeposit.selector, user0, address(KISS), scdpDepositAmount),
            redstonePayload
        );
        uint256 gasDeposit = gasleft();
        (success, ) = address(kresko).call(depositData);
        console.log("gasPoolDeposit", gasDeposit - gasleft());
        require(success, "!success");

        bytes memory withdrawData = abi.encodePacked(
            abi.encodeWithSelector(kresko.poolWithdraw.selector, user0, address(KISS), scdpDepositAmount),
            redstonePayload
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        console.log("gasPoolWithdraw", gasWithdraw - gasleft());

        require(success, "!success");

        address(kresko).call(depositData);

        bytes memory swapData = abi.encodePacked(
            abi.encodeWithSelector(kresko.swap.selector, user0, address(KISS), address(krETH), swapValueWad, 0),
            redstonePayload
        );
        uint256 gasSwap = gasleft();
        (success, ) = address(kresko).call(swapData);
        console.log("gasPoolSwap", gasSwap - gasleft());

        require(success, "!success");

        bytes memory swapData2 = abi.encodePacked(
            abi.encodeWithSelector(
                kresko.swap.selector,
                user0,
                address(krETH),
                address(KISS),
                krETH.balanceOf(user0),
                0
            ),
            redstonePayload
        );
        uint256 gasSwap2 = gasleft();
        (success, ) = address(kresko).call(swapData2);
        console.log("gasPoolSwap2", gasSwap2 - gasleft());

        require(success, "!success");

        bytes memory swapData3 = abi.encodePacked(
            abi.encodeWithSelector(
                kresko.swap.selector,
                user0,
                address(KISS),
                address(krETH),
                KISS.balanceOf(user0),
                0
            ),
            redstonePayload
        );
        uint256 gasSwap3 = gasleft();
        (success, ) = address(kresko).call(swapData3);
        console.log("gasPoolSwap3", gasSwap3 - gasleft());
    }

    /* -------------------------------------------------------------------------- */
    /*                                   helpers                                  */
    /* -------------------------------------------------------------------------- */

    function initSCDPETH() internal returns (uint256 swapValueWad) {
        uint256 depositValueWad = 20000e18;
        mintKISS(user0, depositValueWad);

        uint256 scdpDepositAmount = depositValueWad / 2;
        call(kresko.poolDeposit.selector, user0, address(KISS), scdpDepositAmount, initialPrices);

        swapValueWad = ((scdpDepositAmount / 2) * 1e8) / kissOracle.price();

        swapValueWad.clg("SWAP VALUE WAD");

        call(kresko.swap.selector, user0, address(KISS), address(krETH), swapValueWad, 0, initialPrices);
        console.log("success");
    }

    function mintKISS(address user, uint256 amount) internal {
        usdc.mint(user, amount * (2));
        kresko.depositCollateral(user, address(usdc), amount * (2));
        call(kresko.mintKreskoAsset.selector, user, address(KISS), amount, initialPrices);
    }

    function poolDeposit(address user, address asset, uint256 amount, string memory prices) internal prankAddr(user) {
        MockERC20(asset).mint(user, amount);
        call(kresko.poolDeposit.selector, user, asset, amount, prices);
    }

    function poolWithdraw(address user, address asset, uint256 amount, string memory prices) internal prankAddr(user) {
        call(kresko.poolWithdraw.selector, user, asset, amount, prices);
    }

    function swap(
        address user,
        address assetIn,
        uint256 amount,
        address assetOut,
        string memory prices
    ) internal prankAddr(user) {
        call(kresko.swap.selector, user, assetIn, assetOut, amount, 0, prices);
    }

    function cover(address asset, uint256 amount, string memory prices) internal {
        call(kresko.SDICover.selector, asset, amount, prices);
    }

    function _approvals(address user) internal prankAddr(user) {
        usdc.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        KISS.approve(address(kresko), type(uint256).max);
        krJPY.approve(address(kresko), type(uint256).max);
    }

    function logSimple(string memory prefix) internal {
        logSimple(prefix, initialPrices);
    }

    function logSimple(string memory prefix, string memory prices) internal {
        prefix = prefix.and(" | ");
        prefix.and("*****************").clg();

        uint256 sdiPrice = staticCall(kresko.getSDIPrice.selector, prices);
        uint256 sdiTotalSupply = staticCall(kresko.totalSDI.selector, prices);
        uint256 totalCover = staticCall(kresko.getSDICoverAmount.selector, prices);
        uint256 collateralUSD = staticCall(kresko.getPoolCollateralValue.selector, false, prices);
        uint256 debtUSD = staticCall(kresko.getPoolDebtValue.selector, false, prices);

        uint256 effectiveDebt = staticCall(kresko.getEffectiveSDIDebt.selector, prices);
        uint256 sdiDebtUSD = (effectiveDebt * sdiPrice) / 1e18;

        sdiPrice.clg(prefix.and("SDI Price"), 8);
        sdiTotalSupply.clg(prefix.and("SDI totalSupply"));
        kresko.getTotalSDIDebt().clg(prefix.and("SCDP SDI Debt Amount"));
        totalCover.clg(prefix.and("SCDP SDI Cover Amount"));
        effectiveDebt.clg(prefix.and("SCDP Effective SDI Debt Amount"));

        collateralUSD.clg(prefix.and("SCDP Collateral USD"), 8);
        debtUSD.clg(prefix.and("SCDP KrAsset Debt USD"), 8);
        ((uint256(totalCover) * sdiPrice) / 1e18).clg(prefix.and("SCDP SDI Cover USD"), 8);
        sdiDebtUSD.clg(prefix.and("SCDP SDI Debt USD"), 8);

        staticCall(kresko.getPoolCR.selector, prices).clg(prefix.and("SCDP CR %"), 16);
    }
}

// import {console} from "forge-std/Test.sol";
// import {IERC20Permit} from "common/IERC20Permit.sol";
// import {IKresko} from "scripts/IKresko.sol";
// import {LibTest} from "kresko-helpers/utils/LibTest.sol";
// import {TestBase} from "kresko-helpers/utils/TestBase.sol";
// import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
// import {SDI, Asset} from "scdp/SDI/SDI.sol";
// import {MockOracle} from "test/MockOracle.sol";
// import {MockERC20, WETH} from "test/MockERC20.sol";

// contract SDITest is TestBase("MNEMONIC_TESTNET") {
//     using LibTest for *;

//     uint256 internal constant PERCENT = 0.01e18;
//     IKresko internal kresko;
//     SDI internal sdi;

//     MockERC20 internal btc;
//     MockERC20 internal weth;
//     MockERC20 internal kiss;
//     MockERC20 internal krETH;
//     MockERC20 internal krJPY;

//     MockOracle internal kissOracle;
//     MockOracle internal btcOracle;
//     MockOracle internal ethOracle;
//     MockOracle internal jpyOracle;

//     address internal feeRecipient = address(0xFEE);

//     function setUp() public users(address(121), address(4242), address(42444)) {
//         // tokens
//         weth = new WETH();
//         btc = new MockERC20("BTC", "BTC", 8);
//         kiss = new MockERC20("KISS", "KISS", 18);
//         krETH = new MockERC20("krETH", "krETH", 18);
//         krJPY = new MockERC20("krJPY", "krJPY", 18);

//         // oracles
//         btcOracle = new MockOracle(30000e8);
//         ethOracle = new MockOracle(2000e8);
//         kissOracle = new MockOracle(1e8);
//         jpyOracle = new MockOracle(0.1e8);

//         address[] memory tokensKresko = new address[](3);
//         tokensKresko[0] = address(kiss);
//         tokensKresko[1] = address(krETH);
//         tokensKresko[2] = address(krJPY);

//         address[] memory oraclesKresko = new address[](3);
//         oraclesKresko[0] = address(kissOracle);
//         oraclesKresko[1] = address(ethOracle);
//         oraclesKresko[2] = address(jpyOracle);

//         address[] memory oraclesSDI = new address[](5);
//         oraclesSDI[0] = address(kissOracle);
//         oraclesSDI[1] = address(btcOracle);
//         oraclesSDI[2] = address(ethOracle);
//         oraclesSDI[3] = address(ethOracle);
//         oraclesSDI[4] = address(jpyOracle);

//         address[] memory tokensSDI = new address[](5);
//         tokensSDI[0] = address(kiss);
//         tokensSDI[1] = address(btc);
//         tokensSDI[2] = address(weth);
//         tokensSDI[3] = address(krETH);
//         tokensSDI[4] = address(krJPY);

//         // kresko = new MiniKresko(tokensKresko, oraclesKresko);
//         sdi = new SDI(address(kresko), 8, feeRecipient);

//         for (uint256 i; i < tokensSDI.length; i++) {
//             sdi.addAsset(
//                 Asset(
//                     IERC20Permit(tokensSDI[i]),
//                     AggregatorV3Interface(address(oraclesSDI[i])),
//                     type(uint256).max,
//                     0,
//                     0,
//                     true
//                 )
//             );
//         }

//         // kresko.setSDI(address(sdi));

//         _approvals();
//     }

//     function testMint() public prankAddr(user1) {
//         (uint256 deposits, uint256 debt) = initSCDP(200 * PERCENT);
//         (, , uint256 cr) = kresko.getPoolStats(false);
//         cr.equals(200e16).and(sdi.price).equals(1e8);

//         kresko.getPoolDebtValue(false).equals(debt);
//         // kresko.getTotalPoolCollateralValue.equals(deposits);
//         sdi.totalSupply.and(sdi.effectiveDebt).equals(debt * 10 ** 10);

//         logSimple("testMint");
//     }

//     function testBurn1() public prankAddr(user1) {
//         (, uint256 debt) = initSCDP(200 * PERCENT);

//         uint256 burnAmount = 1000e18;
//         uint256 tSupplyBefore = sdi.totalSupply();
//         kresko.burnKreskoAsset(
//             user1,
//             address(kiss),
//             burnAmount,
//             kresko.getMintedKreskoAssetsIndex(user1, address(kiss))
//         );

//         sdi.totalSupply.equals(tSupplyBefore - burnAmount, "debt should be reduced");
//         sdi.effectiveDebt.equals(sdi.totalSupply);
//         (, , uint256 cr) = kresko.getPoolStats(false);
//         cr.equals(250e16);

//         logSimple("testBurn");
//     }

//     function testDebtValueUp() public prankAddr(user1) {
//         (, uint256 initialDebt) = initSCDP(200 * PERCENT);
//         uint256 tSupplyBefore = sdi.totalSupply();
//         uint256 effectiveDebtBefore = sdi.effectiveDebt();

//         ethOracle.setPrice(3000e8);
//         (, , uint256 cr) = kresko.getPoolStats(false);
//         cr.closeTo(166.6e16, 1e15, "pool cr should be 125%");

//         uint256 newDebtValue = initialDebt + 1000e8;
//         kresko.getPoolDebtValue(false).equals(newDebtValue);

//         sdi.totalSupply.equals(tSupplyBefore, "total supply should not change");
//         sdi.effectiveDebt.equals(effectiveDebtBefore, "effective debt should not change");

//         sdi.price.equals((newDebtValue * 1e8) / initialDebt);
//         logSimple();
//     }

//     function testDebtValueDown() public prankAddr(user1) {
//         (, uint256 initialDebt) = initSCDP(200 * PERCENT);
//         (, , uint256 crStart) = kresko.getPoolStats(false);
//         crStart.equals(200e16);

//         uint256 tSupplyBefore = sdi.totalSupply();
//         uint256 effectiveDebtBefore = sdi.effectiveDebt();

//         ethOracle.setPrice(1000e8);
//         uint256 newDebtValue = initialDebt - 1000e8;

//         (, , uint256 cr) = kresko.getPoolStats(false);
//         cr.equals(250e16, "pool cr should be 250%");

//         kresko.getPoolDebtValue(false).equals(newDebtValue);

//         sdi.totalSupply.equals(tSupplyBefore, "total supply should not change");
//         sdi.effectiveDebt.equals(effectiveDebtBefore, "effective debt should not change");

//         sdi.price.equals((newDebtValue * 1e8) / initialDebt);
//         logSimple();
//     }

//     function testWipeDebt() public prankAddr(user1) {
//         initSCDP(200 * PERCENT);
//         repayAll(user1);

//         kresko.getPoolDebtValue(false).equals(0, "no debt value should remain");
//         sdi.price.equals(1e8);
//         sdi.totalSupply.and(sdi.effectiveDebt).equals(0, "debt should be wiped");
//         sdi.totalKrAssetDebtUSD.equals(0, "debt should be wiped");
//         logSimple("wipeDebt");
//     }

//     function testCoveringDebt1() public prankAddr(user1) {
//         (, uint256 debtValue) = initSCDP(200 * PERCENT);

//         btc.mint(user1, 1e8);
//         sdi.cover(address(btc), 1e8);

//         uint256 BTC_VALUE_START = (1e8 * btcOracle.price()) / 1e8;

//         sdi.totalKrAssetDebtUSD.equals(debtValue);

//         sdi.effectiveDebt.equals(0, "debt should be covered");
//         kresko.getPoolDebtValue(false).equals(0, "no debt value should remain");

//         sdi.price.equals(1e8, "sdi price should not change");
//         sdi.totalDebt.equalsInt(debtValue * 10 ** 10, "debt value should not change");
//         sdi.totalCover.equalsInt(BTC_VALUE_START * 10 ** 10, "cover should be btc value");
//         sdi.totalCoverUSD.equals(BTC_VALUE_START, "cover value should be btc value");
//         sdi.totalSupply.equals((debtValue + BTC_VALUE_START) * 10 ** 10, "total supply should be debt + cover");

//         btcOracle.setPrice(4000e8);

//         uint256 BTC_VALUE_END = (1e8 * btcOracle.price()) / 1e8;

//         sdi.totalCover.equalsInt(BTC_VALUE_START * 10 ** 10, "cover should not change with price");
//         sdi.totalCoverUSD.equals(BTC_VALUE_END, "cover value should change with price");
//         sdi.totalSupply.equals((debtValue + BTC_VALUE_START) * 10 ** 10, "total supply should be debt + cover");

//         sdi.price.equals(
//             ((debtValue + BTC_VALUE_END) * 1e8) / (debtValue + BTC_VALUE_START),
//             "sdi price should change with price"
//         );

//         logSimple("cover");
//     }

//     function testLiquidate() public {
//         uint256 liquidationAmount = 1000e18;

//         vm.startPrank(user1);

//         (, uint256 debtValue) = initSCDP(kresko.getCollateralPoolConfig().lt - (PERCENT * 10));
//         (, , uint256 crBefore) = kresko.getPoolStats(false);
//         uint256 debtBefore = sdi.effectiveDebt();

//         crBefore.closeTo(140e16, 1e15, "cr should be 140%");

//         vm.stopPrank();

//         // this technically same as a flashloan eg. DAI -> acquire KISS from KISSVault
//         vm.startPrank(user2);

//         kiss.mint(user2, liquidationAmount);
//         logSimple("before liquidation");
//         uint256 seizedCollateral = kresko.poolLiquidate(address(kiss), liquidationAmount, address(kiss)); // liquidate KISS debt, seize KISS collateral
//         logSimple("after liquidation");

//         vm.stopPrank();

//         seizedCollateral.isGt(liquidationAmount, "incentive not right"); // incentive
//         sdi.effectiveDebt().lt(debtBefore, "debt should be reduced");

//         (, , uint256 crAfter) = kresko.getPoolStats(false);
//         crAfter.isGt(crBefore, "cr should be increased");
//         kresko.isLiquidatable().equals(false);
//     }

//     function testLiquidateAfterVoluntaryCover() public {
//         vm.startPrank(user1);
//         (, uint256 debtValue) = initSCDP(kresko.LIQ_THRESHOLD() - (PERCENT * 10));
//         (, , uint256 crBefore) = kresko.getPoolStats(false);
//         uint256 liquidationAmount = 1000e18;

//         btc.mint(user1, 0.1e8);
//         sdi.cover(address(btc), 0.1e8);
//         vm.stopPrank();

//         vm.startPrank(user2);
//         kiss.mint(user2, liquidationAmount);

//         // Cannot liquidate, cover increased CR!
//         vm.expectRevert();
//         kresko.liquidate(address(kiss), liquidationAmount, address(kiss));

//         // Increase debt value, liquidatable again
//         ethOracle.setPrice(7_000e8); // 2k -> 7k

//         // Liquidate
//         uint256 seizedCollateral = kresko.poolLiquidate(address(kiss), liquidationAmount, address(kiss)); // liquidate KISS debt, seize KISS collateral
//         vm.stopPrank();

//         seizedCollateral.isGt(liquidationAmount); // incentive

//         (, , uint256 crAfter) = kresko.getPoolStats(false);
//         crAfter.isGt(crBefore, "cr should be increased");

//         kresko.isLiquidatable().equals(false);
//     }

//     function testLiquidateWithCover() public {
//         uint256 liquidationAmount = 1000e18;

//         vm.startPrank(user1);

//         (, uint256 debtValue) = initSCDP(kresko.LIQ_THRESHOLD() - (PERCENT * 10));
//         (, , uint256 crBefore) = kresko.getPoolStats(false);
//         uint256 debtBefore = sdi.effectiveDebt();

//         crBefore.closeTo(140e16, 1e14);

//         vm.stopPrank();

//         // this technically same as a flashloan eg. DAI -> acquire KISS from KISSVault
//         vm.startPrank(user2);

//         kiss.mint(user2, liquidationAmount);
//         logSimple("before liquidation");
//         uint256 seizedCollateral = kresko.coverLiquidate(address(kiss), liquidationAmount, address(kiss)); // liquidate KISS debt, seize KISS collateral
//         logSimple("after liquidation");

//         vm.stopPrank();

//         seizedCollateral.isGt(liquidationAmount); // incentive
//         sdi.effectiveDebt().lt(debtBefore, "debt should be reduced");
//         (, , uint256 crAfter) = kresko.getPoolStats(false);
//         crAfter.isGt(crBefore, "cr should be increased");
//         kresko.isLiquidatable().equals(false);
//     }

//     // function testMiscStuff() public prankAddr(user1) {
//     //   uint256 coverAmount = 10000e18;
//     //   kiss.mint(user1, coverAmount);
//     //   coverAmount.clg('Cover With KISS');
//     //   sdi.cover(address(kiss), coverAmount);

//     //   uint256 collateralAmount = 4000e18;
//     //   kiss.mint(user1, collateralAmount);
//     //   kresko.depositCollateral(address(kiss), collateralAmount);

//     //   uint256 mintAmount = 1e18;
//     //   kresko.mintKreskoAsset(address(krETH), mintAmount);
//     //   logSimple('Setup');

//     //   kiss.mint(user1, coverAmount);
//     //   coverAmount.clg('Cover With KISS');
//     //   sdi.cover(address(kiss), coverAmount);
//     //   logSimple('Cover KISS');

//     //   uint256 coverAmountBTC = 0.33333333e8;
//     //   btc.mint(user1, coverAmountBTC);

//     //   coverAmountBTC.clg('Cover With BTC', 8);
//     //   sdi.cover(address(btc), coverAmountBTC);
//     //   logSimple('Cover: BTC');

//     //   uint256 newEthPrice = 1000e8;
//     //   newEthPrice.clg('ETH to $', 8);
//     //   ethOracle.setPrice(newEthPrice);
//     //   logSimple('krETH: +50%');

//     //   uint256 newBtcPrice = 100_000e8;
//     //   newBtcPrice.clg('BTC to $', 8);
//     //   btcOracle.setPrice(newBtcPrice);
//     //   logSimple('BTC: +300%');

//     //   mintAmount.clg('Burning krETH');
//     //   kresko.burnKreskoAsset(address(krETH), mintAmount);
//     //   logSimple('krETH: Burned');

//     //   uint256 newEthPrice2 = 2300e8;
//     //   newEthPrice2.clg('ETH to $', 8);
//     //   ethOracle.setPrice(newEthPrice2);
//     //   logSimple('krETH: +50%');

//     //   uint256 newBtcPrice2 = 50_000e8;
//     //   newBtcPrice2.clg('BTC to $', 8);
//     //   btcOracle.setPrice(newBtcPrice2);
//     //   logSimple('BTC: -50%');

//     //   mintAmount.clg('minting krETH');
//     //   kresko.mintKreskoAsset(address(krETH), mintAmount);
//     //   logSimple('krETH: Minted');
//     // }

//     /* -------------------------------------------------------------------------- */
//     /*                                   Helpers                                  */
//     /* -------------------------------------------------------------------------- */

//     function initSCDP(uint256 cr) internal returns (uint256 deposits, uint256 debt) {
//         uint256 depositValueWad = 10000e18;
//         uint256 collateralAmount = (depositValueWad * 1e8) / kissOracle.price();
//         kiss.mint(user1, depositValueWad);
//         kresko.depositCollateral(address(kiss), collateralAmount);

//         uint256 mintValue = (depositValueWad * 1e18) / cr;
//         uint256 tenth = mintValue / 10;

//         uint256 kissAmount = (tenth * 4 * 1e8) / kissOracle.price();
//         uint256 krETHAmount = (tenth * 4 * 1e8) / ethOracle.price();
//         uint256 krJPYAmount = (tenth * 2 * 1e8) / jpyOracle.price();

//         kresko.mintKreskoAsset(user1, address(kiss), kissAmount);
//         kresko.mintKreskoAsset(user1, address(krJPY), krJPYAmount);
//         kresko.mintKreskoAsset(user1, address(krETH), krETHAmount);

//         uint256 oracleConversion = 10 ** (18 - kresko.oracleDecimals());
//         return (depositValueWad / oracleConversion, mintValue / oracleConversion);
//     }

//     function repayAll(address user) internal {
//         kresko.burnKreskoAsset(
//             user,
//             address(kiss),
//             kiss.balanceOf(user),
//             kresko.getMintedKreskoAssetsIndex(address(kiss))
//         );
//         kresko.burnKreskoAsset(
//             user,
//             address(krJPY),
//             krJPY.balanceOf(user),
//             kresko.getMintedKreskoAssetsIndex(address(krJPY))
//         );
//         kresko.burnKreskoAsset(
//             user,
//             address(krETH),
//             krETH.balanceOf(user),
//             kresko.getMintedKreskoAssetsIndex(address(krETH))
//         );
//     }

//     function _approvals() internal {
//         _approveAll(user0);
//         _approveAll(user1);
//         _approveAll(user2);
//     }

//     function _approveAll(address user) internal {
//         vm.startPrank(user);
//         kiss.approve(address(sdi), type(uint256).max);
//         krJPY.approve(address(sdi), type(uint256).max);
//         krETH.approve(address(sdi), type(uint256).max);
//         btc.approve(address(sdi), type(uint256).max);
//         weth.approve(address(sdi), type(uint256).max);
//         kiss.approve(address(kresko), type(uint256).max);
//         krJPY.approve(address(kresko), type(uint256).max);
//         krETH.approve(address(kresko), type(uint256).max);
//         btc.approve(address(kresko), type(uint256).max);
//         weth.approve(address(kresko), type(uint256).max);
//         vm.stopPrank();
//     }

//     function logSimple() internal {
//         logSimple("");
//     }

//     function logSimple(string memory prefix) internal {
//         prefix = prefix.and(" | ");
//         prefix.and("*****************").clg();
//         sdi.totalSupply().clg(prefix.and("SDI totalSupply"));
//         sdi.totalDebt().clg(prefix.and("SDI Debt"));
//         ((uint256(sdi.totalDebt()) * sdi.price()) / 1e18).clg(prefix.and("SDI Debt USD"), 8);
//         sdi.totalKrAssetDebtUSD().clg(prefix.and("SCDP KrAssets USD"), 8);
//         sdi.totalCover().clg(prefix.and("SDI Cover"));
//         ((uint256(sdi.totalCover()) * sdi.price()) / 1e18).clg(prefix.and("SDI Cover USD"), 8);
//         sdi.totalCoverUSD().clg(prefix.and("SDI CoverAssets USD"), 8);
//         sdi.price().clg(prefix.and("SDI Price"), 8);
//         kresko.getTotalPoolCollateralValue().clg(prefix.and("SCDP Collateral USD"), 8);
//         sdi.effectiveDebt().clg(prefix.and("SCDP Effective Debt"));
//         kresko.getPoolDebtValue(false).clg(prefix.and("SCDP Effective Debt USD"), 8);
//         (, , uint256 cr) = kresko.getPoolStats(false);
//         cr.clg(prefix.and("KR pool CR"), 16);
//     }
// }
