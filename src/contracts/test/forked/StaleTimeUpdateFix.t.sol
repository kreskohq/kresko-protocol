// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {StaleTimeUpdate} from "scripts/tasks/StaleTimeUpdate.s.sol";
import {MintArgs, SwapArgs} from "common/Args.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Asset, Enums} from "common/Types.sol";
import {Errors} from "common/Errors.sol";
import {LiquidationArgs} from "common/Args.sol";

contract StaleTimeUpdateTest is Tested, StaleTimeUpdate {
    using Log for *;
    using ShortAssert for *;

    address user = makeAddr("user");
    Asset krEURAsset;
    address eur = 0x83BB68a7437b02ebBe1ab2A0E8B464CC5510Aafe;

    function setUp() public override {
        super.setUp();

        execDeployer();

        deal(user, 1e18);
        deal(USDCAddr, user, 100_000e6);
        dealERC1155(questAddr, user, 0, 1);

        prank(user);
        approvals();
        IERC20(eur).approve(kreskoAddr, type(uint256).max);
        kresko.depositCollateral(user, USDCAddr, 25_000e6);

        prank(safe);
        krEURAsset = kresko.getAsset(eur);
    }

    function testUpdateResult() external {
        provider.getTickerStatus(bytes32("EUR")).eq(false, "market-should-be-closed");

        prank(user);

        fetchPythAndUpdate("ETH,USDC,BTC,ARB,SOL,EUR");
        vm.warp(pythEP.getPriceUnsafe(0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43).timestamp);

        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krETHAddr, amount: 0.1e18}), pythUpdate);

        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: user,
                assetIn: krETHAddr,
                assetOut: kissAddr,
                amountIn: 0.01e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );

        prank(safe);
        executeCuts("facets-market-status-fix", false);

        prank(user);
        kresko.swapSCDP(
            SwapArgs({
                receiver: user,
                assetIn: krETHAddr,
                assetOut: kissAddr,
                amountIn: 0.01e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    // function testPriceKrEURIsStale() external {
    //     uint256 btcTimestamp = pythEP
    //         .getPriceUnsafe(0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43)
    //         .timestamp;
    //     uint256 eurTimestamp = pythEP
    //         .getPriceUnsafe(0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b)
    //         .timestamp;

    //     eurTimestamp.lt(btcTimestamp, "krEUR-price-should-be-staler-than-btc");
    // }

    // function testCannotMintKrEUR() external pranked(user) {
    //     fetchPythAndUpdate("EUR");
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             Errors.MARKET_CLOSED.selector,
    //             Errors.id(krEURAddr),
    //             string(abi.encodePacked(bytes32("EUR")))
    //         )
    //     );
    //     kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);
    // }

    // function testCanMintKrEUR() external pranked(user) {
    //     _openNonCrypto();
    //     fetchPythAndUpdate("EUR");
    //     kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);
    //     IERC20(krEURAddr).balanceOf(user).eq(10e18, "krEUR-balance-should-be-10");
    // }

    // function testCanDepositkrEUR() external pranked(user) {
    //     _openNonCrypto();
    //     fetchPythAndUpdate("EUR");
    //     kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);

    //     _closeNonCrypto();
    //     kresko.depositCollateral(user, krEURAddr, 10e18);
    // }

    // function testCannotTradeTokrEUR() external pranked(user) {
    //     kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krETHAddr, amount: 0.1e18}), pythUpdate);

    //     _closeNonCrypto();
    //     fetchPythAndUpdate("EUR");
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             Errors.MARKET_CLOSED.selector,
    //             Errors.id(krEURAsset.anchor),
    //             string(abi.encodePacked(bytes32("EUR")))
    //         )
    //     );
    //     kresko.swapSCDP(
    //         SwapArgs({
    //             receiver: user,
    //             assetIn: krETHAddr,
    //             assetOut: krEURAddr,
    //             amountIn: 0.1e18,
    //             amountOutMin: 0,
    //             prices: pythUpdate
    //         })
    //     );
    // }
}
