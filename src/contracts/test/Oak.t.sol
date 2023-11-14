// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {Help, Log} from "kresko-lib/utils/Libs.sol";
import {Role} from "common/Constants.sol";
import {Local} from "scripts/deploy/Run.s.sol";
import {Test} from "forge-std/Test.sol";
import {state} from "scripts/deploy/base/DeployState.s.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract NewProtocolTest is Local, Test {
    using ShortAssert for *;
    using Help for *;
    using Log for *;

    bytes redstoneCallData;

    function setUp() public {
        // enableLogger();
        redstoneCallData = getRedstonePayload(initialPrices);
        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);
        setupUsers(userCfg, assets);

        prank(getAddr(0));
        call(kresko.swapSCDP.selector, getAddr(0), address(state().kiss), krETH.addr, 1000e18, 0, initialPrices);
    }

    function testSomething() external {
        uint256 cr = staticCall(kresko.getCollateralRatioSCDP.selector, initialPrices);
        cr.gt(0, "cr-zero");
    }
}
