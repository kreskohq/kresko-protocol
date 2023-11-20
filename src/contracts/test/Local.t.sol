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

    function testLocalThing() public {
        vm.createSelectFork("localhost");
        KISS kiss = KISS(0x43e53A48Ee932BbB1D09180a2bF02bBe70020449);
        IVault vault = IVault(0x6a35d47B9139C6390bE8487836E54AB56eB4135B);
        IERC20 usdce = IERC20(0x478c4dd5f377De1a9D1Dc5bf11457a00E9C0e7F6);
        prank(getAddr(0));
        uint256 allowanceToVault = usdce.allowance(getAddr(0), address(vault));
        uint256 allowanceToKiss = usdce.allowance(getAddr(0), address(kiss));
        allowanceToKiss.dlg("allowance-kiss", 6);
        allowanceToVault.dlg("allowance-vault", 6);
        // usdce.approve(address(vault), 1 ether);
        usdce.approve(address(kiss), 1 ether);
        usdce.balanceOf(getAddr(0)).dlg("deplo-bal", 6);
        kiss.vaultDeposit(address(usdce), 111200, getAddr(0));
        // vault.maxRedeem(address(usdc), getAddr(0)).dlg("max-redeem", 18);
        // (uint256 preview, uint256 fees) = vault.previewRedeem(address(usdc), 1 ether);
        // preview.dlg("preview", 18);
        // assertEq(value, 1, "val-not-eq");
        // assertEq(addr, address(0x123), "addr-not-eq");
    }
}
