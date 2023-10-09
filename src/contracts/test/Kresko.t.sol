// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {console} from "forge-std/Test.sol";
import {LibTest} from "kresko-helpers/utils/LibTest.sol";
import {TestBase} from "kresko-helpers/utils/TestBase.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {DeployHelper} from "scripts/utils/DeployHelper.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {Asset} from "common/Types.sol";

// solhint-disable
contract KreskoTest is TestBase("MNEMONIC_TESTNET"), DeployHelper {
    using LibTest for *;
    using Strings for uint256;
    using PercentageMath for uint256;

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
        DeployParams memory params = DeployParams({
            admin: admin,
            seqFeed: address(new MockSequencerUptimeFeed()),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8
        });
        deployDiamond(params);
        vm.warp(3601);
        (usdc, usdcOracle) = deployAndAddCollateral("USDC", bytes12("USDC"), 18, 1e8, true);
        (krETH, , ethOracle) = deployAndWhitelistKrAsset("krETH", bytes12("ETH"), params.admin, 2000e8, true, true, false);
        (KISS, , kissOracle) = deployAndWhitelistKrAsset("KISS", bytes12("KISS"), params.admin, 1e8, true, false, false);
        (krJPY, , jpyOracle) = deployAndWhitelistKrAsset("krJPY", bytes12("JPY"), params.admin, 1e8, true, false, false);
        enableSwapBothWays(address(usdc), address(krETH), true);
        enableSwapSingleWay(address(krJPY), address(krETH), true);

        vm.stopPrank();
    }

    function testSetup() public {
        kresko.owner().equals(admin);
        Asset memory usdcConfig = kresko.getAsset(address(usdc));
        Asset memory krETHConfig = kresko.getAsset(address(krETH));
        kresko.getMinCollateralRatio().equals(150e2);
        kresko.getCurrentParametersSCDP().minCollateralRatio.equals(200e2);
        kresko.getCurrentParametersSCDP().liquidationThreshold.equals(150e2);
        usdcConfig.isSCDPCollateral.equals(true);
        usdcConfig.isSCDPDepositAsset.equals(true);

        usdcConfig.decimals.equals(usdc.decimals());
        usdcConfig.depositLimitSCDP.equals(type(uint128).max);
        usdcConfig.liquidityIndexSCDP.equals(1e27);

        krETHConfig.isKrAsset.equals(true);
        krETHConfig.isSCDPKrAsset.equals(true);
        krETHConfig.liqIncentiveSCDP.equals(110e2);
        krETHConfig.openFee.equals(2e2);
        krETHConfig.closeFee.equals(2e2);
        krETHConfig.supplyLimit.equals(type(uint128).max);
        krETHConfig.protocolFeeShareSCDP.equals(25e2);

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

        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(100e8);
    }

    function testMint() public prankAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).equals(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, initialPrices);
        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(998e8);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).equals(120e8);
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
        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(996e8);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).equals(0);
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

        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).equals(0);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).equals(0);
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
