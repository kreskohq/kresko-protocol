// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {Deploy} from "scripts/deploy/run/Deploy.s.sol";
import {Deployed} from "scripts/utils/libs/Deployed.s.sol";
import {LibDeploy} from "scripts/utils/libs/LibDeploy.s.sol";

contract NewTest is Deploy, Test {
    address internal addr;
    uint256 internal value;
    address internal krETH = Deployed.addr("krETH");

    function setUp() public {
        console2.log("setup");
        super.localtest(0);
        addr = address(0x123);
        value = 1;
    }

    function testSomething() public {
        console2.log(krETH);
        assertEq(value, 1, "val-not-eq");
        assertEq(addr, address(0x123), "addr-not-eq");
        console2.log(LibDeploy.pd3(bytes32("KRESKO")));
    }
}
