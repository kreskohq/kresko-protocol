// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {console} from "forge-std/Test.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";
import {TestBase} from "kresko-lib/utils/TestBase.sol";
import {KreskoForgeUtils} from "scripts/utils/KreskoForgeUtils.s.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";

// solhint-disable

contract SCDPTest is TestBase("MNEMONIC_TESTNET"), KreskoForgeUtils {
    using LibTest for *;
    using WadRay for uint256;
    using PercentageMath for uint256;

    MockTokenInfo internal usdc;
    KrAssetInfo internal KISS;
    KrAssetInfo internal krETH;
    KrAssetInfo internal krJPY;
    KrAssetInfo internal krTSLA;

    string usdcPrice = "USDC:1:8";
    string ethPrice = "ETH:2000:8";
    string jpyPrice = "JPY:1:8";
    string kissPrice = "KISS:1:8";
    string tslaPrice = "TSLA:1:8";
    string initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8,TSLA:1:8";

    function setUp() public users(address(11), address(22), address(33)) {
        deployCfg = CoreConfig({
            admin: TEST_ADMIN,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            staleTime: 86401,
            council: getMockSafe(TEST_ADMIN),
            treasury: TEST_TREASURY
        });
        vm.startPrank(deployCfg.admin);

        kresko = deployDiamond(deployCfg);
        proxyFactory = deployDeploymentFactory(TEST_ADMIN);
        vm.warp(3601);

        usdc = mockCollateral(
            bytes32("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            ext_full
        );
        KISS = mockKrAsset(
            bytes32("KISS"),
            address(0),
            MockConfig({symbol: "KISS", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_full,
            deployCfg
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
            MockConfig({symbol: "krJPY", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_swap_only,
            deployCfg
        );
        krTSLA = mockKrAsset(
            bytes32("TSLA"),
            address(0),
            MockConfig({symbol: "krTSLA", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_swap_only,
            deployCfg
        );
        kresko.setFeeAssetSCDP(KISS.addr);
        enableSwapBothWays(KISS.addr, krETH.addr, true);
        enableSwapBothWays(krJPY.addr, krETH.addr, true);
        enableSwapBothWays(krTSLA.addr, krETH.addr, true);
        enableSwapBothWays(krJPY.addr, krTSLA.addr, true);
        kresko.enableCoverAssetSDI(KISS.addr);
        vm.stopPrank();
        _approvals(user0);
        _approvals(user1);
        _approvals(user2);
    }

    function testSetup() public {
        staticCall(kresko.getEffectiveSDIDebt.selector, initialPrices).equals(0, "debt should be 0");
        staticCall(kresko.totalSDI.selector, initialPrices).equals(0, "total supply should be 0");
        Asset memory kissConfig = kresko.getAsset(KISS.addr);
        kresko.getAsset(usdc.addr).liquidityIndexSCDP.equals(1e27);
        kissConfig.liquidityIndexSCDP.equals(1e27);
        kissConfig.isCoverAsset.equals(true);
    }

    function testDeposit() public {
        uint256 amount = 1000e18;

        usdc.mock.mint(user0, 1000e18);
        poolDeposit(user0, usdc.addr, amount, initialPrices);
        staticCall(kresko.totalSDI.selector, initialPrices).equals(0, "total supply should be 0");
        usdc.mock.balanceOf(address(kresko)).equals(amount);

        staticCall(kresko.getTotalCollateralValueSCDP.selector, true, initialPrices).equals(1000e8);
    }

    function testWithdraw() public {
        usdc.mock.mint(user0, 1000e18);
        poolDeposit(user0, usdc.addr, 1000e18, initialPrices);

        poolWithdraw(user0, usdc.addr, 1000e18, initialPrices);
        staticCall(kresko.getTotalCollateralValueSCDP.selector, true, initialPrices).equals(0);
    }

    function testSwap() public {
        uint256 depositAmount = 10000e18;
        uint256 borrowAmount = 1000e18;
        uint256 swapAmount = borrowAmount / 4;

        usdc.mock.mint(user0, depositAmount * 2);
        usdc.mock.mint(user1, depositAmount);

        vm.startPrank(user0);
        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        call(kresko.mintKreskoAsset.selector, user0, KISS.addr, borrowAmount, initialPrices);

        vm.stopPrank();
        poolDeposit(user0, usdc.addr, depositAmount, initialPrices);
        poolDeposit(user0, KISS.addr, borrowAmount, initialPrices);

        vm.startPrank(user1);
        kresko.depositCollateral(user1, usdc.addr, depositAmount);
        call(kresko.mintKreskoAsset.selector, user1, KISS.addr, borrowAmount, initialPrices);
        vm.stopPrank();

        swap(user1, KISS.addr, swapAmount, krETH.addr, initialPrices);

        logSimple("testSwap");
    }

    function testCover() public {
        vm.startPrank(user0);
        initSCDPETH();
        logSimple("#1 Init: $15,000 collateral (-fees) | Swap $5,000 KISS -> krETH (-fees)");

        staticCall(kresko.getEffectiveSDIDebt.selector, initialPrices).equals(5760e18, "effectiveDebt");
        kresko.getTotalSDIDebt.equals(5760e18, "total-debt");

        // changePrank(user1);
        // mintKISS(user1, 1000e18);
        // cover(KISS.addr, 1000e18, initialPrices);

        // uint256 totalCoverBefore = staticCall(kresko.getSDICoverAmount.selector, initialPrices);
        // totalCoverBefore.equals(1000e18, "total-cover-before");

        // kresko.getTotalSDIDebt.equals(5760e18, "total-debt");
        // staticCall(kresko.getEffectiveSDIDebt.selector, initialPrices).equals(4760e18);
        // staticCall(kresko.getSDIPrice.selector, initialPrices).equals(1e8, "sdi-price");

        // logSimple("#2 Cover 1000 KISS ($1,000)");

        // ethOracle.setPrice(2666e8);
        // string memory newPrices = "USDC:1:8,ETH:2666:8,JPY:1:8,KISS:1:8,TSLA:1:8";

        // uint256 totalCoverAfter = staticCall(kresko.getSDICoverAmount.selector, newPrices);

        // totalCoverAfter.lt(totalCoverBefore, "total-cover-after");

        // logSimple("#3 krETH price up to: $2,666", newPrices);

        // changePrank(user0);
        // call(kresko.swapSCDP.selector, user0, krETH.addr, KISS.addr, krETH.balanceOf(user0), 0, newPrices);
        // logSimple("#4 1 krETH debt repaid", newPrices);
    }

    function testGas() public prankedAddr(user0) {
        uint256 depositValueWad = 20000e18;
        mintKISS(user0, depositValueWad);
        bool success;

        bytes memory redstonePayload = getRedstonePayload(initialPrices);

        uint256 scdpDepositAmount = depositValueWad / 2;
        uint256 swapValueWad = ((scdpDepositAmount / 2) * 1e8) / KISS.mockFeed.price();

        bytes memory depositData = abi.encodePacked(
            abi.encodeWithSelector(kresko.depositSCDP.selector, user0, KISS.addr, scdpDepositAmount),
            redstonePayload
        );
        uint256 gasDeposit = gasleft();
        (success, ) = address(kresko).call(depositData);
        console.log("gasPoolDeposit", gasDeposit - gasleft());
        require(success, "!success");

        bytes memory withdrawData = abi.encodePacked(
            abi.encodeWithSelector(kresko.withdrawSCDP.selector, user0, KISS.addr, scdpDepositAmount),
            redstonePayload
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        console.log("gasPoolWithdraw", gasWithdraw - gasleft());

        require(success, "!success");

        address(kresko).call(depositData);

        bytes memory swapData = abi.encodePacked(
            abi.encodeWithSelector(kresko.swapSCDP.selector, user0, KISS.addr, krETH.addr, swapValueWad, 0),
            redstonePayload
        );
        uint256 gasSwap = gasleft();
        (success, ) = address(kresko).call(swapData);
        console.log("gasPoolSwap", gasSwap - gasleft());

        require(success, "!success");

        bytes memory swapData2 = abi.encodePacked(
            abi.encodeWithSelector(kresko.swapSCDP.selector, user0, krETH.addr, KISS.addr, krETH.krAsset.balanceOf(user0), 0),
            redstonePayload
        );
        uint256 gasSwap2 = gasleft();
        (success, ) = address(kresko).call(swapData2);
        console.log("gasPoolSwap2", gasSwap2 - gasleft());

        require(success, "!success");

        bytes memory swapData3 = abi.encodePacked(
            abi.encodeWithSelector(kresko.swapSCDP.selector, user0, KISS.addr, krETH.addr, KISS.krAsset.balanceOf(user0), 0),
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
        call(kresko.depositSCDP.selector, user0, KISS.addr, scdpDepositAmount, initialPrices);

        swapValueWad = ((scdpDepositAmount / 2) * 1e8) / KISS.mockFeed.price();

        call(kresko.swapSCDP.selector, user0, KISS.addr, krETH.addr, swapValueWad, 0, initialPrices);
    }

    function mintKISS(address user, uint256 amount) internal {
        usdc.mock.mint(user, amount * (2));
        kresko.depositCollateral(user, usdc.addr, amount * (2));
        call(kresko.mintKreskoAsset.selector, user, KISS.addr, amount, initialPrices);
    }

    function poolDeposit(address user, address asset, uint256 amount, string memory prices) internal prankedAddr(user) {
        call(kresko.depositSCDP.selector, user, asset, amount, prices);
    }

    function poolWithdraw(address user, address asset, uint256 amount, string memory prices) internal prankedAddr(user) {
        call(kresko.withdrawSCDP.selector, user, asset, amount, prices);
    }

    function swap(
        address user,
        address assetIn,
        uint256 amount,
        address assetOut,
        string memory prices
    ) internal prankedAddr(user) {
        call(kresko.swapSCDP.selector, user, assetIn, assetOut, amount, 0, prices);
    }

    function cover(address asset, uint256 amount, string memory prices) internal {
        call(kresko.SDICover.selector, asset, amount, prices);
    }

    function _approvals(address user) internal prankedAddr(user) {
        usdc.mock.approve(address(kresko), type(uint256).max);
        krETH.krAsset.approve(address(kresko), type(uint256).max);
        KISS.krAsset.approve(address(kresko), type(uint256).max);
        krJPY.krAsset.approve(address(kresko), type(uint256).max);
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
        uint256 collateralUSD = staticCall(kresko.getTotalCollateralValueSCDP.selector, false, prices);
        uint256 debtUSD = staticCall(kresko.getTotalDebtValueSCDP.selector, false, prices);

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

        staticCall(kresko.getCollateralRatioSCDP.selector, prices).clg(prefix.and("SCDP CR %"), 2);
    }
}
