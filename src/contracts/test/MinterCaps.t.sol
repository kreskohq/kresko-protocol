// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript, Asset} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {toWad} from "common/funcs/Math.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract ArbTest is Tested, ArbScript {
    using Log for *;
    using Help for *;
    using ShortAssert for *;
    address sender;
    address[] empty = new address[](0);

    function setUp() public {
        vm.createSelectFork("arbitrum");
        useMnemonic("MNEMONIC");
        fetchPythAndUpdate();

        prank(safe);

        sender = getAddr(0);
        prank(sender);
        approvals();
    }

    function test_kissLimit() public pranked(sender) {
        uint256 kissSupply = kiss.totalSupply();
        uint256 vKissSupply = IERC20(vaultAddr).totalSupply() + kresko.getDebtSCDP(kissAddr);

        kissSupply.dlg("kiss-supply");
        vKissSupply.dlg("vkiss-supply");

        uint256 minterSupply = kissSupply - vKissSupply;
        minterSupply.dlg("minter-supply");
    }

    function test_krAssetLimitPositiveRebase() public pranked(sender) {
        // uint256 minterSupply = minterSupplyDefault(krETHAddr);
        // minterSupply.dlg("supply-before");
        // prank(safe);
        // krETH.rebase(uint248(10 ether), true, empty);
        // uint256 minterSupplyAfter = minterSupplyDefault(krETHAddr);
        // (minterSupply * 10).eq(minterSupplyAfter, "Supply should increase by 10x");
    }

    function test_krAssetLimitNegativeRebase() public pranked(sender) {
        // uint256 minterSupply = minterSupplyDefault(krETHAddr);
        // minterSupply.dlg("supply-before");
        // prank(safe);
        // krETH.rebase(uint248(10 ether), false, empty);
        // uint256 minterSupplyAfter = minterSupplyDefault(krETHAddr);
        // (minterSupply / 10).eq(minterSupplyAfter, "Supply should increase by 10x");
    }
}
