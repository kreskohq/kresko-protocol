// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {TestBase} from "kresko-lib/utils/TestBase.t.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {KISS} from "kiss/KISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";

contract NewTest is TestBase("MNEMONIC_DEVNET") {
    address internal addr;
    uint256 internal value;
    using Log for *;

    function setUp() public {
        addr = address(0x123);
        value = 1;
    }

    function testSomething() public {
        vm.createSelectFork("localhost");
        KISS kiss = KISS(0xfff7895810Dd83345c97FE90A95450d88F1c25C5);
        IVault vault = IVault(0xc7B3dA534D0114DeF17400279A35137E5A649F9e);
        IERC20 usdc = IERC20(0xF5A0D69303a45D71c96d8414e3591393e393C64A);
        kiss.balanceOf(getAddr(0)).dlg("deplo-bal", 18);
        vault.maxRedeem(address(usdc), getAddr(0)).dlg("max-redeem", 18);
        (uint256 preview, uint256 fees) = vault.previewRedeem(address(usdc), 1 ether);
        preview.dlg("preview", 18);
        assertEq(value, 1, "val-not-eq");
        assertEq(addr, address(0x123), "addr-not-eq");
    }
}
