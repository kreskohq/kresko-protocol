// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {console} from "forge-std/Test.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";
import {TestBase} from "kresko-lib/utils/TestBase.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {KreskoForgeUtils} from "scripts/utils/KreskoForgeUtils.s.sol";

import {Asset} from "common/Types.sol";

// solhint-disable
contract KreskoTest is TestBase("MNEMONIC_TESTNET"), KreskoForgeUtils {
    using LibTest for *;
    using Strings for uint256;
    using PercentageMath for uint256;

    MockCollDeploy internal usdc;
    KrDeployExtended internal krETH;
    KrDeployExtended internal krJPY;
    KrDeployExtended internal KISS;

    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8";

    function setUp() public users(address(111), address(222), address(333)) {
        deployArgs = DeployArgs({
            admin: testAdmin,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            staleTime: 86401,
            council: getMockSafe(testAdmin),
            treasury: TEST_TREASURY
        });
        vm.startPrank(deployArgs.admin);
        proxyFactory = deployProxyFactory(testAdmin);
        kresko = deployDiamond(deployArgs);
        vm.warp(3601);

        usdc = mockCollateral(
            bytes32("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            fullCollateral
        );

        krETH = mockKrAsset(
            bytes32("ETH"),
            address(0),
            MockConfig({symbol: "krETH", price: 2000e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultKrAsset,
            deployArgs
        );

        KISS = mockKrAsset(
            bytes32("KISS"),
            address(0),
            MockConfig({symbol: "KISS", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultKISS,
            deployArgs
        );
        krJPY = mockKrAsset(
            bytes32("JPY"),
            address(0),
            MockConfig({symbol: "krJPY", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultKrAsset,
            deployArgs
        );

        enableSwapBothWays(usdc.addr, krETH.addr, true);
        enableSwapSingleWay(krJPY.addr, krETH.addr, true);

        vm.stopPrank();
    }

    function testSetup() public {
        kresko.owner().equals(deployArgs.admin);
        Asset memory usdcConfig = kresko.getAsset(usdc.addr);
        Asset memory krETHConfig = kresko.getAsset(krETH.addr);
        kresko.getMinCollateralRatioMinter().equals(150e2);
        kresko.getParametersSCDP().minCollateralRatio.equals(200e2);
        kresko.getParametersSCDP().liquidationThreshold.equals(150e2);
        usdcConfig.isSharedOrSwappedCollateral.equals(true);
        usdcConfig.isSharedCollateral.equals(true);

        usdcConfig.decimals.equals(usdc.asset.decimals());
        usdcConfig.depositLimitSCDP.equals(type(uint128).max);
        usdcConfig.liquidityIndexSCDP.equals(1e27);

        krETHConfig.isMinterMintable.equals(true);
        krETHConfig.isSwapMintable.equals(true);
        krETHConfig.liqIncentiveSCDP.equals(110e2);
        krETHConfig.openFee.equals(2e2);
        krETHConfig.closeFee.equals(2e2);
        krETHConfig.maxDebtMinter.equals(type(uint128).max);
        krETHConfig.protocolFeeShareSCDP.equals(25e2);

        kresko.getSwapEnabledSCDP(usdc.addr, krETH.addr).equals(true);
        kresko.getSwapEnabledSCDP(krETH.addr, usdc.addr).equals(true);
        kresko.getSwapEnabledSCDP(krJPY.addr, krETH.addr).equals(true);

        kresko.getSwapEnabledSCDP(krETH.addr, krJPY.addr).equals(false);
        kresko.getSwapEnabledSCDP(krJPY.addr, usdc.addr).equals(false);
        kresko.getSwapEnabledSCDP(usdc.addr, krJPY.addr).equals(false);
    }

    function testDeposit() public prankedAddr(user0) {
        uint256 depositAmount = 100e18;

        usdc.asset.mint(user0, depositAmount);
        usdc.asset.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).equals(depositAmount);

        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(100e8);
    }

    function testMint() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.asset.mint(user0, depositAmount);
        usdc.asset.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, initialPrices);
        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(998e8);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).equals(120e8);
    }

    function testBurn() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.asset.mint(user0, depositAmount);
        usdc.asset.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, initialPrices);
        call(kresko.burnKreskoAsset.selector, user0, krJPY.addr, mintAmount, 0, initialPrices);
        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(996e8);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).equals(0);
    }

    function testWithdraw() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.asset.mint(user0, depositAmount);
        usdc.asset.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, initialPrices);
        call(kresko.burnKreskoAsset.selector, user0, krJPY.addr, mintAmount, 0, initialPrices);
        call(kresko.withdrawCollateral.selector, user0, usdc.addr, 998e18, 0, initialPrices);

        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(0);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).equals(0);
    }

    function testGas() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;
        bytes memory redstonePayload = getRedstonePayload(initialPrices);
        bool success;

        usdc.asset.mint(user0, depositAmount);
        usdc.asset.approve(address(kresko), depositAmount);

        uint256 gasDeposit = gasleft();
        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        console.log("gasDepositCollateral", gasDeposit - gasleft());

        bytes memory mintData = abi.encodePacked(
            abi.encodeWithSelector(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount),
            redstonePayload
        );
        uint256 gasMint = gasleft();
        (success, ) = address(kresko).call(mintData);
        console.log("gasMintKreskoAsset", gasMint - gasleft());
        require(success, "!success");

        bytes memory burnData = abi.encodePacked(
            abi.encodeWithSelector(kresko.burnKreskoAsset.selector, user0, krJPY.addr, mintAmount, 0),
            redstonePayload
        );
        uint256 gasBurn = gasleft();
        (success, ) = address(kresko).call(burnData);
        console.log("gasBurnKreskoAsset", gasBurn - gasleft());
        require(success, "!success");

        bytes memory withdrawData = abi.encodePacked(
            abi.encodeWithSelector(kresko.withdrawCollateral.selector, user0, usdc.addr, 998e18, 0),
            redstonePayload
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        console.log("gasWithdrawCollateral", gasWithdraw - gasleft());
        require(success, "!success");
    }
}
