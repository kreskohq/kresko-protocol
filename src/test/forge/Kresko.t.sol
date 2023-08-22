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

contract KreskoTest is TestBase("MNEMONIC_TESTNET"), KreskoDeployer {
    IKresko internal kresko;

    using LibTest for *;
    address internal admin = address(0xABABAB);

    function setUp() public prankAddr(admin) {
        kresko = deployDiamond(admin);
    }

    function testSetup() public {
        kresko.owner().equals(admin);
        kresko.minimumCollateralizationRatio().equals(1.5e18);
    }
}
