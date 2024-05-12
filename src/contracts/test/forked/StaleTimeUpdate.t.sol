// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {StaleTimeUpdate} from "scripts/tasks/StaleTimeUpdate.s.sol";
import {MintArgs, SwapArgs} from "common/Args.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";

contract StaleTimeUpdateTest is Tested, StaleTimeUpdate {
    using Log for *;
    using ShortAssert for *;

    address user = makeAddr("user");
    bytes32[] tickers = [bytes32(0x43525950544f0000000000000000000000000000000000000000000000000000)];
    bool[] closed = [false];
    bool[] open = [true];

    function setUp() public override {
        super.setUp();
        execAll();
        deal(user, 1e18);
        deal(USDCAddr, user, 100_000e6);
        dealERC1155(questAddr, user, 0, 1);

        sender = getAddr(0);
        prank(sender);
        fetchPythAndUpdate();
        vm.warp(pythEP.getPriceUnsafe(0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43).timestamp);

        prank(user);
        approvals();
        kresko.depositCollateral(user, USDCAddr, 25_000e6);
    }

    function testCanMintKrEUR() external pranked(user) {
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 1e18}), pythUpdate);
        kresko.getAccountCollateralAmount(user, USDCAddr).clg("coll");
    }

    function testSwapCryptoKrAsset() external pranked(sender) {
        _closeCrypto();
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: sender,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: 1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        _openCrypto();
        kresko.swapSCDP(
            SwapArgs({
                receiver: sender,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: 1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    function testSwapNonCryptoKrAsset() external pranked(sender) {
        _closeCrypto();
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: sender,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: 1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        _openCrypto();
        kresko.swapSCDP(
            SwapArgs({
                receiver: sender,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: 1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    function testMintCryptoKrAsset() external pranked(sender) {
        _closeCrypto();
        vm.expectRevert();
        kresko.mintKreskoAsset(MintArgs({account: sender, receiver: sender, krAsset: kissAddr, amount: 1e18}), pythUpdate);

        _openCrypto();
        kresko.mintKreskoAsset(MintArgs({account: sender, receiver: sender, krAsset: kissAddr, amount: 1e18}), pythUpdate);
    }

    function _closeCrypto() internal repranked(provider.owner()) {
        provider.setStatus(tickers, closed);
    }

    function _openCrypto() internal repranked(provider.owner()) {
        provider.setStatus(tickers, open);
    }
}
