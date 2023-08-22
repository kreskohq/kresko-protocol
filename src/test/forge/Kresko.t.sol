// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {console} from "forge-std/Test.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {IKresko} from "common/IKresko.sol";
import {LibTest} from "kresko-helpers/utils/LibTest.sol";
import {TestBase} from "kresko-helpers/utils/TestBase.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {SDI, Asset} from "scdp/SDI/SDI.sol";
import {MockOracle} from "test/MockOracle.sol";
import {MockERC20, WETH} from "test/MockERC20.sol";
import {KreskoDeployer} from "./utils/KreskoDeployer.sol";
import {DiamondHelper} from "./utils/DiamondHelper.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";

contract KreskoTest is TestBase("MNEMONIC_TESTNET"), KreskoDeployer {
    IKresko internal kresko;

    using LibTest for *;
    address internal admin = address(0xABABAB);

    MockERC20 internal usdc;
    KreskoAsset internal krETH;
    KreskoAsset internal krJPY;

    MockOracle internal usdcOracle;
    MockOracle internal ethOracle;
    MockOracle internal jpyOracle;

    function setUp() public {
        (kresko, ) = deployDiamond(admin);
        (usdc, usdcOracle) = deployAndWhitelistCollateral("USDC", 18, address(kresko), 1e8);
        (krETH, , ethOracle) = deployAndWhitelistKrAsset("krETH", admin, address(kresko), 2000e8);
        (krJPY, , jpyOracle) = deployAndWhitelistKrAsset("krJPY", admin, address(kresko), 0.01e8);
        enableSCDPCollateral(kresko, address(usdc));
        enableSCDPKrAsset(kresko, address(krETH));
        enableSwapBothWays(kresko, address(usdc), address(krETH), true);
        enableSwapSingleWay(kresko, address(krJPY), address(krETH), true);
    }

    function testSetup() public {
        kresko.owner().equals(admin);
        kresko.minimumCollateralizationRatio().equals(1.5e18);
        kresko.getSCDPConfig().mcr.equals(2e18);
        kresko.getSCDPConfig().lt.equals(1.5e18);
        kresko.collateralAsset(address(usdc)).exists.equals(true);
        kresko.kreskoAsset(address(krETH)).exists.equals(true);

        kresko.getPoolCollateral(address(usdc)).liquidationIncentive.equals(1.1e18);
        kresko.getPoolCollateral(address(usdc)).decimals.equals(usdc.decimals());
        kresko.getPoolCollateral(address(usdc)).depositLimit.equals(type(uint256).max);
        kresko.getPoolCollateral(address(usdc)).liquidityIndex.equals(1e27);

        kresko.getPoolKrAsset(address(krETH)).openFee.equals(0.005e18);
        kresko.getPoolKrAsset(address(krETH)).closeFee.equals(0.005e18);
        kresko.getPoolKrAsset(address(krETH)).supplyLimit.equals(type(uint256).max);
        kresko.getPoolKrAsset(address(krETH)).protocolFee.equals(0.5e18);

        kresko.getSCDPSwapEnabled(address(usdc), address(krETH)).equals(true);
        kresko.getSCDPSwapEnabled(address(krETH), address(usdc)).equals(true);
        kresko.getSCDPSwapEnabled(address(krJPY), address(krETH)).equals(true);

        kresko.getSCDPSwapEnabled(address(krETH), address(krJPY)).equals(false);
        kresko.getSCDPSwapEnabled(address(krJPY), address(usdc)).equals(false);
        kresko.getSCDPSwapEnabled(address(usdc), address(krJPY)).equals(false);
    }
}
