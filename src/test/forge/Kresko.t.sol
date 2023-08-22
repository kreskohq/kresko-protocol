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

    MockOracle internal usdcOracle;
    MockOracle internal ethOracle;

    function setUp() public {
        kresko = deployDiamond(admin);
        (usdc, usdcOracle) = deployAndWhitelistCollateral("USDC", 18, address(kresko), 1e8);
        (krETH, , ethOracle) = deployAndWhitelistKrAsset("krETH", admin, address(kresko), 2000e8);
    }

    function testSetup() public {
        kresko.owner().equals(admin);
        kresko.minimumCollateralizationRatio().equals(1.5e18);
        kresko.getSCDPConfig().mcr.equals(2e18);
        kresko.getSCDPConfig().lt.equals(1.5e18);
        kresko.collateralAsset(address(usdc)).exists.equals(true);
        kresko.kreskoAsset(address(krETH)).exists.equals(true);
    }
}
