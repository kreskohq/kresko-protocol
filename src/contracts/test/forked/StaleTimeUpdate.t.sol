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

    function setUp() public override {
        super.setUp();

        execAll();

        deal(user, 1e18);
        deal(USDCAddr, user, 100_000e6);
        dealERC1155(questAddr, user, 0, 1);

        prank(user);
        fetchPythAndUpdate();
        vm.warp(pythEP.getPriceUnsafe(0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43).timestamp);

        approvals();
        IERC20(krEURAddr).approve(kreskoAddr, type(uint256).max);
        kresko.depositCollateral(user, USDCAddr, 25_000e6);

        prank(safe);
        states_looseOracles();

        krEURAsset = kresko.getAsset(krEURAddr);
    }

    function testTickerClosable() external {
        kresko.getOracleOfTicker(bytes32("EUR"), Enums.OracleType.Pyth).isClosable.eq(true, "eur-pyth-should-be-closable");
        kresko.getOracleOfTicker(bytes32("EUR"), Enums.OracleType.Chainlink).isClosable.eq(
            true,
            "eur-chainlink-should-be-closable"
        );

        kresko.getOracleOfTicker(bytes32("SOL"), Enums.OracleType.Pyth).isClosable.eq(false, "sol-pyth-should-not-be-closable");
        kresko.getOracleOfTicker(bytes32("SOL"), Enums.OracleType.Chainlink).isClosable.eq(
            false,
            "sol-chainlink-should-not-be-closable"
        );

        kresko.getOracleOfTicker(bytes32("BTC"), Enums.OracleType.Pyth).isClosable.eq(false, "btc-pyth-should-not-be-closable");
        kresko.getOracleOfTicker(bytes32("BTC"), Enums.OracleType.Chainlink).isClosable.eq(
            false,
            "btc-chainlink-should-not-be-closable"
        );
    }

    function testMarketIsClosed() external {
        provider.getTickerStatus(bytes32("EUR")).eq(false, "market-should-be-closed");
        _openNonCrypto();
        provider.getTickerStatus(bytes32("EUR")).eq(true, "market-should-be-open");
    }

    function testPriceKrEURIsStale() external {
        uint256 btcTimestamp = pythEP
            .getPriceUnsafe(0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43)
            .timestamp;
        uint256 eurTimestamp = pythEP
            .getPriceUnsafe(0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b)
            .timestamp;

        eurTimestamp.lt(btcTimestamp, "krEUR-price-should-be-staler-than-btc");
    }

    function testCannotMintKrEUR() external pranked(user) {
        fetchPythAndUpdate("EUR");
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MARKET_CLOSED.selector,
                Errors.id(krEURAddr),
                string(abi.encodePacked(bytes32("EUR")))
            )
        );
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);
    }

    function testCanMintKrEUR() external pranked(user) {
        _openNonCrypto();
        fetchPythAndUpdate("EUR");
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);
        IERC20(krEURAddr).balanceOf(user).eq(10e18, "krEUR-balance-should-be-10");
    }

    function testCanLiquidateKrEUR() external pranked(user) {
        _openNonCrypto();
        fetchPythAndUpdate("EUR");
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10000e18}), pythUpdate);

        address liquidator = makeAddr("liquidator");
        IERC20(krEURAddr).transfer(liquidator, 10000e18);

        _closeNonCrypto();

        prank(safe);
        kresko.setAssetKFactor(krEURAddr, 200e2);

        uint256 ratioBefore = kresko.getAccountCollateralRatio(user);

        prank(liquidator);
        IERC20(krEURAddr).approve(kreskoAddr, 10000e18);

        kresko.liquidate(
            LiquidationArgs({
                account: user,
                repayAssetAddr: krEURAddr,
                repayAmount: 2000e18,
                seizeAssetAddr: USDCAddr,
                seizeAssetIndex: 0,
                repayAssetIndex: 0,
                prices: pythUpdate
            })
        );

        ratioBefore.lt(kresko.getAccountCollateralRatio(user), "collateral-ratio-should-increase");
    }

    function testCanDepositkrEUR() external pranked(user) {
        _openNonCrypto();
        fetchPythAndUpdate("EUR");
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);

        _closeNonCrypto();
        kresko.depositCollateral(user, krEURAddr, 10e18);
    }

    function testCannotTradeTokrEUR() external pranked(user) {
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krETHAddr, amount: 0.1e18}), pythUpdate);

        _closeNonCrypto();
        fetchPythAndUpdate("EUR");
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.MARKET_CLOSED.selector,
                Errors.id(krEURAsset.anchor),
                string(abi.encodePacked(bytes32("EUR")))
            )
        );
        kresko.swapSCDP(
            SwapArgs({
                receiver: user,
                assetIn: krETHAddr,
                assetOut: krEURAddr,
                amountIn: 0.1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    function testCanTradeFromkrEUR() external pranked(user) {
        _openNonCrypto();
        fetchPythAndUpdate("EUR");
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: krEURAddr, amount: 10e18}), pythUpdate);

        _closeNonCrypto();
        kresko.swapSCDP(
            SwapArgs({
                receiver: user,
                assetIn: krEURAddr,
                assetOut: krETHAddr,
                amountIn: 10e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    function testSwapCryptoKrAsset() external pranked(user) {
        _closeCrypto();
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: user,
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
                receiver: user,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: 1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    function testSwapNonCryptoKrAsset() external pranked(user) {
        _closeCrypto();
        vm.expectRevert();
        kresko.swapSCDP(
            SwapArgs({
                receiver: user,
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
                receiver: user,
                assetIn: kissAddr,
                assetOut: krSOLAddr,
                amountIn: 1e18,
                amountOutMin: 0,
                prices: pythUpdate
            })
        );
    }

    function testMintCryptoKrAsset() external pranked(user) {
        _closeCrypto();
        vm.expectRevert();
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: kissAddr, amount: 1e18}), pythUpdate);

        _openCrypto();
        kresko.mintKreskoAsset(MintArgs({account: user, receiver: user, krAsset: kissAddr, amount: 1e18}), pythUpdate);
    }

    bytes32[] exchangesCrypto = [bytes32(0x43525950544f0000000000000000000000000000000000000000000000000000)];

    // bytes32[] exchangesNonCrypto = [bytes32(0x464f524558000000000000000000000000000000000000000000000000000000)];

    function _closeCrypto() internal repranked(provider.owner()) {
        provider.setStatus(exchangesCrypto, closed);
    }

    function _openCrypto() internal repranked(provider.owner()) {
        provider.setStatus(exchangesCrypto, open);
    }

    function _closeNonCrypto() internal repranked(provider.owner()) {
        provider.setStatus(exchangesNonCrypto, closed);
    }

    function _openNonCrypto() internal repranked(provider.owner()) {
        provider.setStatus(exchangesNonCrypto, open);
    }
}
