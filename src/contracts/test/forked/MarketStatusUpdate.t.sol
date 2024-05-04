// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {MarketStatusUpdate, DataV2} from "scripts/MarketStatus.s.sol";
import {MintArgs, SwapArgs} from "common/Args.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Errors} from "common/Errors.sol";

contract MarketStatusUpdateTest is MarketStatusUpdate {
    using Log for *;
    using ShortAssert for *;

    bytes32[] tickers = [bytes32(0x43525950544f0000000000000000000000000000000000000000000000000000)];
    bool[] closed = [false];
    bool[] open = [true];

    function setUp() public override {
        super.setUp();
        payload0010();

        sender = getAddr(0);
        prank(sender);
        fetchPythAndUpdate();
        vm.warp(pythEP.getPriceUnsafe(0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43).timestamp);
    }

    function test_setMarketStatus() external {
        kresko.getMarketStatusProvider().eq(address(provider));
    }

    function test_getMarketStatus() external {
        address[] memory assets = new address[](9);
        assets[0] = address(wethAddr);
        assets[1] = address(USDCeAddr);
        assets[2] = address(USDCAddr);
        assets[3] = address(WBTCAddr);
        assets[4] = address(ARBAddr);
        assets[5] = address(krETHAddr);
        assets[6] = address(krBTCAddr);
        assets[7] = address(krSOLAddr);
        assets[8] = address(kissAddr);

        for (uint i = 0; i < assets.length; i++) {
            kresko.getMarketStatus(assets[i]).eq(true);
        }

        vm.expectRevert();
        kresko.getMarketStatus(address(DAIAddr));
    }

    function test_DataV2() external {
        // All crypto assets should be always open
        DataV2.DVAsset[] memory result = dataV2.getVAssets();
        for (uint256 i = 0; i < result.length; i++) {
            result[i].isMarketOpen.eq(true);
        }
    }

    function testSwapMarketStatus() external {
        prank(provider.owner());
        provider.setStatus(tickers, closed);

        prank(sender);
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

        prank(provider.owner());
        provider.setStatus(tickers, open);

        prank(sender);
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

    function testMintMarketStatus() external {
        prank(provider.owner());
        provider.setStatus(tickers, closed);

        prank(sender);
        vm.expectRevert();
        kresko.mintKreskoAsset(MintArgs({account: sender, receiver: sender, krAsset: kissAddr, amount: 1e18}), pythUpdate);

        prank(provider.owner());
        provider.setStatus(tickers, open);

        prank(sender);
        kresko.mintKreskoAsset(MintArgs({account: sender, receiver: sender, krAsset: kissAddr, amount: 1e18}), pythUpdate);
    }
}
