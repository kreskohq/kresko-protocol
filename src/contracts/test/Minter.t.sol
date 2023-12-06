// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {TestBase} from "kresko-lib/utils/TestBase.t.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {_DeprecatedTestUtils} from "scripts/utils/deprecated/_DeprecatedTestUtils.s.sol";
import {Asset} from "common/Types.sol";
import {Log} from "kresko-lib/utils/Libs.sol";

// solhint-disable
contract MinterTest is TestBase("MNEMONIC_TESTNET"), _DeprecatedTestUtils {
    using ShortAssert for *;
    using Strings for uint256;
    using PercentageMath for uint256;

    MockTokenInfo internal usdc;
    KrAssetInfo internal krETH;
    KrAssetInfo internal krJPY;
    KrAssetInfo internal KISS;

    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";
    string internal jpyPrice = "JPY:1:8";
    string internal kissPrice = "KISS:1:8";
    string internal initialPrices = "USDC:1:8,ETH:2000:8,JPY:1:8,KISS:1:8";

    function setUp() public users(address(111), address(222), address(333)) {
        deployCfg = CoreConfig({
            admin: TEST_ADMIN,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            gatingManager: address(0),
            scdpMcr: 200e2,
            scdpLt: 150e2,
            coverThreshold: 160e2,
            coverIncentive: 1.01e4,
            sdiPrecision: 8,
            oraclePrecision: 8,
            staleTime: 86401,
            council: getMockSafe(TEST_ADMIN),
            treasury: TEST_TREASURY
        });
        vm.startPrank(deployCfg.admin);
        factory = deployDeploymentFactory(TEST_ADMIN);
        kresko = deployDiamondOneTx(deployCfg);
        vm.warp(3601);

        usdc = mockCollateral(
            bytes32("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_full
        );

        krETH = mockKrAsset(
            bytes32("ETH"),
            address(0),
            MockConfig({symbol: "krETH", price: 2000e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_default,
            deployCfg
        );

        KISS = mockKrAsset(
            bytes32("KISS"),
            address(0),
            MockConfig({symbol: "KISS", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            kiss_default,
            deployCfg
        );
        krJPY = mockKrAsset(
            bytes32("JPY"),
            address(0),
            MockConfig({symbol: "krJPY", price: 1e8, setFeeds: true, dec: 18, feedDec: 8}),
            kr_default,
            deployCfg
        );

        enableSwapBothWays(usdc.addr, krETH.addr, true);
        enableSwapSingleWay(krJPY.addr, krETH.addr, true);

        vm.stopPrank();
    }

    function testMinterSetup() public {
        kresko.owner().eq(deployCfg.admin);
        Asset memory usdcConfig = kresko.getAsset(usdc.addr);
        Asset memory krETHConfig = kresko.getAsset(krETH.addr);
        kresko.getMinCollateralRatioMinter().eq(150e2, "minter-min-collateral-ratio");
        kresko.getParametersSCDP().minCollateralRatio.eq(200e2, "scdp-min-collateral-ratio");
        kresko.getParametersSCDP().liquidationThreshold.eq(150e2, "scdp-liquidation-threshold");
        usdcConfig.isSharedOrSwappedCollateral.eq(true, "usdc-issharedorswappedcollateral");
        usdcConfig.isSharedCollateral.eq(true, "usdc-issharedcollateral");

        usdcConfig.decimals.eq(usdc.mock.decimals(), "usdc-decimals");
        usdcConfig.depositLimitSCDP.eq(type(uint128).max, "usdc-deposit-limit");
        kresko.getAssetIndexesSCDP(usdc.addr).currFeeIndex.eq(1e27, "usdc-fee-index");
        kresko.getAssetIndexesSCDP(usdc.addr).currLiqIndex.eq(1e27, "usdc-liq-index");

        krETHConfig.isMinterMintable.eq(true, "kreth-is-minter-mintable");
        krETHConfig.isSwapMintable.eq(true, "kreth-is-swap-mintable");
        krETHConfig.liqIncentiveSCDP.eq(105e2, "kreth-liquidation-incentive");
        krETHConfig.openFee.eq(2e2, "kreth-open-fee");
        krETHConfig.closeFee.eq(2e2, "kreth-close-fee");
        krETHConfig.maxDebtMinter.eq(type(uint128).max, "kreth-max-debt-minter");
        krETHConfig.protocolFeeShareSCDP.eq(20e2, "kreth-protocol-fee-share");

        kresko.getSwapEnabledSCDP(usdc.addr, krETH.addr).eq(true, "usdc-kreth-swap-enabled");
        kresko.getSwapEnabledSCDP(krETH.addr, usdc.addr).eq(true, "kreth-usdc-swap-enabled");
        kresko.getSwapEnabledSCDP(krJPY.addr, krETH.addr).eq(true, "krjpy-kreth-swap-enabled");

        kresko.getSwapEnabledSCDP(krETH.addr, krJPY.addr).eq(false, "kreth-krjpy-swap-enabled");
        kresko.getSwapEnabledSCDP(krJPY.addr, usdc.addr).eq(false, "krjpy-usdc-swap-enabled");
        kresko.getSwapEnabledSCDP(usdc.addr, krJPY.addr).eq(false, "usdc-krjpy-swap-enabled");
    }

    function testMinterDeposit() public prankedAddr(user0) {
        uint256 depositAmount = 100e18;

        usdc.mock.mint(user0, depositAmount);
        usdc.mock.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).eq(depositAmount);

        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).eq(100e8);
    }

    function testMinterMint() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mock.mint(user0, depositAmount);
        usdc.mock.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).eq(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, user0, initialPrices);
        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).eq(998e8);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).eq(120e8);
    }

    function testMinterBurn() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mock.mint(user0, depositAmount);
        usdc.mock.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).eq(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, user0, initialPrices);
        call(kresko.burnKreskoAsset.selector, user0, krJPY.addr, mintAmount, 0, user0, initialPrices);
        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).eq(996e8);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).eq(0);
    }

    function testMinterWithdraw() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;

        usdc.mock.mint(user0, depositAmount);
        usdc.mock.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        kresko.getAccountCollateralAmount(user0, usdc.addr).eq(depositAmount);

        call(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, user0, initialPrices);
        call(kresko.burnKreskoAsset.selector, user0, krJPY.addr, mintAmount, 0, user0, initialPrices);
        call(kresko.withdrawCollateral.selector, user0, usdc.addr, 998e18, 0, user0, initialPrices);

        staticCall(kresko.getAccountTotalCollateralValue.selector, user0, usdcPrice).eq(0);
        staticCall(kresko.getAccountTotalDebtValue.selector, user0, initialPrices).eq(0);
    }

    function testMinterGas() public prankedAddr(user0) {
        uint256 depositAmount = 1000e18;
        uint256 mintAmount = 100e18;
        bytes memory redstonePayload = getRedstonePayload(initialPrices);
        bool success;

        usdc.mock.mint(user0, depositAmount);
        usdc.mock.approve(address(kresko), depositAmount);

        uint256 gasDeposit = gasleft();
        kresko.depositCollateral(user0, usdc.addr, depositAmount);
        Log.clg("gasDepositCollateral", gasDeposit - gasleft());

        bytes memory mintData = abi.encodePacked(
            abi.encodeWithSelector(kresko.mintKreskoAsset.selector, user0, krJPY.addr, mintAmount, user0),
            redstonePayload
        );
        uint256 gasMint = gasleft();
        (success, ) = address(kresko).call(mintData);
        Log.clg("gasMintKreskoAsset", gasMint - gasleft());
        require(success, "!success");

        bytes memory burnData = abi.encodePacked(
            abi.encodeWithSelector(kresko.burnKreskoAsset.selector, user0, krJPY.addr, mintAmount, 0, user0),
            redstonePayload
        );
        uint256 gasBurn = gasleft();
        (success, ) = address(kresko).call(burnData);
        Log.clg("gasBurnKreskoAsset", gasBurn - gasleft());
        require(success, "!success");

        bytes memory withdrawData = abi.encodePacked(
            abi.encodeWithSelector(kresko.withdrawCollateral.selector, user0, usdc.addr, 998e18, 0, user0),
            redstonePayload
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        Log.clg("gasWithdrawCollateral", gasWithdraw - gasleft());
        require(success, "!success");
    }
}
