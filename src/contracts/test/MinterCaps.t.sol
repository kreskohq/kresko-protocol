// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {MinterCapLogicUpdate} from "scripts/MinterCap.s.sol";
import {MintArgs, SwapArgs} from "common/Args.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MinterCaps is MinterCapLogicUpdate, Tested {
    using Log for *;
    using Help for *;
    using ShortAssert for *;
    address[] empty = new address[](0);

    address user;

    function setUp() public override {
        super.setUp();
        useMnemonic("MNEMONIC_DEVNET");
        payload0009();
        afterRun();
        fetchPythAndUpdate();

        user = getAddr(100);
        deal(USDCAddr, user, 200_000e6);
        deal(user, 1000 ether);
        dealERC1155(questAddr, user, 0, 1);
        prank(user);
        approvals();
        kresko.depositCollateral(user, USDCAddr, 1000e6);
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

    function test_kissMintLimit() public pranked(user) {
        uint256 mintAmount = 10 ether;
        uint256 supplyBefore = kresko.getMinterSupply(kissAddr);

        vault.deposit(USDCAddr, 10e6, user);
        kiss.vaultMint(USDCAddr, 10 ether, user);

        kresko.mintKreskoAsset(MintArgs({krAsset: kissAddr, amount: mintAmount, account: user, receiver: user}), pythUpdate);

        uint256 supplyAfter = kresko.getMinterSupply(kissAddr);
        (supplyBefore + mintAmount).eq(supplyAfter, "supply-after-mint");
    }

    function test_krAssetMintLimit() public pranked(user) {
        uint256 mintAmount = 0.01 ether;
        uint256 supplyBefore = kresko.getMinterSupply(krETHAddr);

        (bool success, ) = krETHAddr.call{value: 0.01 ether}("");
        success.eq(true, "eth-kreth-wrap");

        kiss.vaultMint(USDCAddr, 10_000 ether, user);

        kresko.swapSCDP(
            SwapArgs({
                assetIn: kissAddr,
                assetOut: krETHAddr,
                amountIn: 10_000 ether,
                amountOutMin: 0,
                receiver: user,
                prices: pythUpdate
            })
        );

        kresko.mintKreskoAsset(MintArgs({krAsset: krETHAddr, amount: mintAmount, account: user, receiver: user}), pythUpdate);

        uint256 supplyAfter = kresko.getMinterSupply(krETHAddr);
        (supplyBefore + mintAmount).eq(supplyAfter, "supply-after-mint");
    }

    function test_assets() public {
        peekAccount(user, false);
    }
}
