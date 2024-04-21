// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {MinterCapLogicUpdate} from "scripts/MinterCap.s.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MinterCaps is MinterCapLogicUpdate, Tested {
    using Log for *;
    using Help for *;
    using ShortAssert for *;
    address[] empty = new address[](0);

    function setUp() public override {
        super.setUp();
        payload0006();
    }

    function test_kissLimit() public pranked(sender) {
        kresko.getAsset(kissAddr).maxDebtMinter.eq(60_000 ether, "kiss-max-debt");

        uint256 kissSupply = kiss.totalSupply();
        uint256 vKissSupply = IERC20(vaultAddr).totalSupply() + kresko.getDebtSCDP(kissAddr);

        kissSupply.dlg("kiss-supply");
        vKissSupply.dlg("vkiss-supply");

        uint256 minterSupply = kissSupply - vKissSupply;
        kresko.getMinterSupply(kissAddr).eq(minterSupply, "kiss-supply");
    }

    function test_krAssetLimitPositiveRebase() public pranked(safe) {
        uint256 minterSupply = kresko.getMinterSupply(krETHAddr);
        krETH.rebase(uint248(10 ether), true, empty);
        uint256 minterSupplyAfter = kresko.getMinterSupply(krETHAddr);
        (minterSupply * 10).eq(minterSupplyAfter, "Supply should increase by 10x");
    }

    function test_krAssetLimitNegativeRebase() public pranked(safe) {
        uint256 minterSupply = kresko.getMinterSupply(krETHAddr);
        krETH.rebase(uint248(10 ether), false, empty);
        uint256 minterSupplyAfter = kresko.getMinterSupply(krETHAddr);
        (minterSupply / 10).eq(minterSupplyAfter, "Supply should decrease by 10x");
    }
}
