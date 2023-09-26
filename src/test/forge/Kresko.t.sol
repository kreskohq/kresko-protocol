// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {console} from "forge-std/Test.sol";
import {LibTest} from "kresko-helpers/utils/LibTest.sol";
import {TestBase} from "kresko-helpers/utils/TestBase.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {DeployHelper} from "./utils/DeployHelper.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {Asset} from "common/Types.sol";

// solhint-disable
contract KreskoTest is TestBase("MNEMONIC_TESTNET"), DeployHelper {
    using LibTest for *;

    address internal admin = address(0xABABAB);

    MockERC20 internal usdc;
    KreskoAsset internal krETH;
    KreskoAsset internal krJPY;
    KreskoAsset internal KISS;

    MockOracle internal usdcOracle;
    MockOracle internal ethOracle;
    MockOracle internal jpyOracle;
    MockOracle internal kissOracle;

    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8";

    function setUp() public users(address(111), address(222), address(333)) {
        vm.startPrank(admin);

        deployDiamond(admin, address(new MockSequencerUptimeFeed()));
        vm.warp(3601);
        // (usdc, usdcOracle) = deployAndWhitelistCollateral("USDC", bytes32("USDC"), 18, 1e8);
        // (krETH, , ethOracle) = deployAndWhitelistKrAsset("krETH", bytes32("ETH"), admin, 2000e8);
        // (KISS, , kissOracle) = deployAndWhitelistKrAsset("KISS", bytes32("KISS"), admin, 1e8);
        // (krJPY, , jpyOracle) = deployAndWhitelistKrAsset("krJPY", bytes32("JPY"), admin, 1e8);
        // enableSCDPCollateral(address(usdc), initialPrices);
        // enableSCDPKrAsset(address(krETH), initialPrices);
        enableSwapBothWays(address(usdc), address(krETH), true);
        enableSwapSingleWay(address(krJPY), address(krETH), true);

        vm.stopPrank();
    }

    function testSetup() public {
        kresko.owner().equals(admin);
        Asset memory usdcConfig = kresko.getAsset(address(usdc));
        Asset memory krETHConfig = kresko.getAsset(address(krETH));
        kresko.getMinCollateralRatio().equals(1.5e18);
        kresko.getCurrentParametersSCDP().mcr.equals(2e18);
        kresko.getCurrentParametersSCDP().lt.equals(1.5e18);
        usdcConfig.isSCDPCollateral.equals(true);
        usdcConfig.isSCDPDepositAsset.equals(true);

        usdcConfig.decimals.equals(usdc.decimals());
        usdcConfig.depositLimitSCDP.equals(type(uint256).max);
        usdcConfig.liquidityIndexSCDP.equals(1e27);

        krETHConfig.isKrAsset.equals(true);
        krETHConfig.isSCDPKrAsset.equals(true);
        krETHConfig.liquidationIncentiveSCDP.equals(1.1e18);
        krETHConfig.openFee.equals(0.005e18);
        krETHConfig.closeFee.equals(0.005e18);
        krETHConfig.supplyLimit.equals(type(uint256).max);
        krETHConfig.protocolFeeSCDP.equals(0.25e18);

        kresko.getSwapEnabledSCDP(address(usdc), address(krETH)).equals(true);
        kresko.getSwapEnabledSCDP(address(krETH), address(usdc)).equals(true);
        kresko.getSwapEnabledSCDP(address(krJPY), address(krETH)).equals(true);

        kresko.getSwapEnabledSCDP(address(krETH), address(krJPY)).equals(false);
        kresko.getSwapEnabledSCDP(address(krJPY), address(usdc)).equals(false);
        kresko.getSwapEnabledSCDP(address(usdc), address(krJPY)).equals(false);
    }

    function testDeposit() public prankAddr(user0) {
        uint256 depositAmount = 100e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).equals(depositAmount);
        staticCall(kresko.getAccountCollateralValue.selector, user0, usdcPrice).equals(100e8);
    }

    function testMint() public prankAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, initialPrices);
        staticCall(kresko.getAccountCollateralValue.selector, user0, usdcPrice).equals(1000e8);
        staticCall(kresko.getAccountDebtValue.selector, user0, initialPrices).equals(120e8);
    }

    function testBurn() public prankAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, initialPrices);
        call(kresko.burnKreskoAsset.selector, user0, address(krJPY), mintAmount, 0, initialPrices);
        staticCall(kresko.getAccountCollateralValue.selector, user0, usdcPrice).equals(998e8);
        staticCall(kresko.getAccountDebtValue.selector, user0, initialPrices).equals(0);
    }

    function testWithdraw() public prankAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, initialPrices);
        call(kresko.burnKreskoAsset.selector, user0, address(krJPY), mintAmount, 0, initialPrices);
        call(kresko.withdrawCollateral.selector, user0, address(usdc), 998e18, 0, initialPrices);

        staticCall(kresko.getAccountCollateralValue.selector, user0, usdcPrice).equals(0e8);
        staticCall(kresko.getAccountDebtValue.selector, user0, initialPrices).equals(0);
    }

    function testGas() public prankAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;
        bytes memory redstonePayload = getRedstonePayload(initialPrices);
        bool success;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        uint256 gasDeposit = gasleft();
        kresko.depositCollateral(user0, address(usdc), depositAmount);
        console.log("gasDepositCollateral", gasDeposit - gasleft());

        bytes memory mintData = abi.encodePacked(
            abi.encodeWithSelector(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount),
            redstonePayload
        );
        uint256 gasMint = gasleft();
        (success, ) = address(kresko).call(mintData);
        console.log("gasMintKreskoAsset", gasMint - gasleft());
        require(success, "!success");

        bytes memory burnData = abi.encodePacked(
            abi.encodeWithSelector(kresko.burnKreskoAsset.selector, user0, address(krJPY), mintAmount, 0),
            redstonePayload
        );
        uint256 gasBurn = gasleft();
        (success, ) = address(kresko).call(burnData);
        console.log("gasBurnKreskoAsset", gasBurn - gasleft());
        require(success, "!success");

        bytes memory withdrawData = abi.encodePacked(
            abi.encodeWithSelector(kresko.withdrawCollateral.selector, user0, address(usdc), 998e18, 0),
            redstonePayload
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        console.log("gasWithdrawCollateral", gasWithdraw - gasleft());
        require(success, "!success");
    }
}
