// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {AddKrAsset} from "scripts/tasks/AddKrAsset.s.sol";
import {Asset} from "common/Types.sol";
import {MintArgs, SwapArgs, BurnArgs} from "common/Args.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {KreskoAssetAnchor} from "kresko-asset/KreskoAssetAnchor.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract AddKrAssetTest is Tested, AddKrAsset {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    Asset assetConfig;
    KreskoAsset newAsset;
    KreskoAssetAnchor newAssetAnchor;

    bool expectedMarketStatus = true;

    uint256 constant testMintValue = 100e8;
    uint256 testMint;

    function setUp() public override {
        super.initialize(225611889);

        createAddKrAsset();

        assetConfig = kresko.getAsset(newAssetAddr);
        newAsset = KreskoAsset(newAssetAddr);
        newAssetAnchor = KreskoAssetAnchor(newAsset.anchor());

        fetchPythSync();

        testMint = (testMintValue).divWad(kresko.getPrice(newAssetAddr));
        prank(safe);

        (user0, user1) = (address(0x1234), address(0x4321));
        address[2] memory testUsers = [user0, user1];
        for (uint256 i; i < testUsers.length; i++) {
            address testUser = testUsers[i];

            deal(testUser, 1 ether);
            deal(USDCAddr, testUser, 100_000e6);
            dealERC1155(kreskianAddr, testUser, 0, 1);

            prank(testUser);
            approvals();
            newAsset.approve(kreskoAddr, type(uint256).max);
            kresko.depositCollateral(testUser, USDCAddr, 10_000e6);
        }
    }

    function testAssetMetadatas() external {
        newAsset.getRoleMemberCount("").eq(1, "asset-role-member-count");
        newAssetAnchor.getRoleMemberCount("").eq(1, "anchor-role-member-count");
        newAsset.hasRole("", safe).eq(true, "asset-has-role");
        newAssetAnchor.hasRole("", safe).eq(true, "anchor-has-role");

        assetConfig.anchor.eq(newAsset.anchor(), "asset-anchor");
        address(newAssetAnchor.asset()).eq(newAssetAddr, "anchor-asset");

        assetSymbol.eq(newAsset.symbol(), "asset-symbol");
        newAsset.name().eq(string.concat("Kresko: ", assetName), "asset-name");
        newAssetAnchor.symbol().eq(string.concat("akr", assetTicker), "anchor-symbol");
        newAssetAnchor.name().eq(string.concat("Kresko Asset Anchor: ", assetName), "anchor-name");
    }

    function testAssetFeeds() external {
        uint256 primaryPrice = kresko.getPrice(newAssetAddr);
        uint256 secondaryPrice = uint256(kresko.getPushPrice(newAssetAddr).answer);

        uint256 ratio = primaryPrice.pctDiv(secondaryPrice);

        ratio.closeTo(100e2, 5e2, "price-ratio");

        marketStatus.getTickerExchange(assetConfig.ticker).eq(marketStatusSource, "ticker-market-status-source");
        marketStatus.getTickerStatus(assetConfig.ticker).eq(expectedMarketStatus, "ticker-market-status");
    }

    function testTradeRoutes() external {
        address[] memory assets = kresko.getKreskoAssetsSCDP();

        for (uint256 i; i < assets.length; i++) {
            address assetIn = assets[i];

            for (uint256 j; j < assets.length; j++) {
                address assetOut = assets[j];
                if (assetIn == assetOut) continue;

                bool enabled = kresko.getSwapEnabledSCDP(assetIn, assetOut);
                assetIn.clg("asset-in");
                assetOut.clg("asset-out");
                assertTrue(enabled, "route-enabled");

                enabled = kresko.getSwapEnabledSCDP(assetOut, assetIn);
                assetIn.clg("asset-out");
                assetOut.clg("asset-in");
                assertTrue(enabled, "route-2-enabled");
            }
        }
    }

    function testCoreActions() external pranked(user0) {
        uint256 price = kresko.getPrice(newAssetAddr);

        kresko.mintKreskoAsset(
            MintArgs({krAsset: newAssetAddr, amount: testMint, account: user0, receiver: user0}),
            pythUpdate
        );
        kresko.getAccountMintedAssets(user0)[0].eq(newAssetAddr, "user0-minted-asset");
        kresko.getAccountDebtAmount(user0, newAssetAddr).eq(testMint, "user0-debt-amount");
        kresko.getAccountTotalDebtValue(user0).eq(price.mulWad(testMint), "user0-debt-value");

        uint256 swapAmount = testMint / 10;
        uint256 burnAmount = testMint / 2;

        kresko.swapSCDP(
            SwapArgs({
                assetIn: newAssetAddr,
                assetOut: kissAddr,
                amountIn: swapAmount,
                amountOutMin: 0,
                receiver: user0,
                prices: new bytes[](0)
            })
        );

        kresko.getSwapDepositsSCDP(newAssetAddr).eq(swapAmount, "swap-deposits");
        newAsset.balanceOf(kreskoAddr).eq(swapAmount, "asset-balance");

        newAsset.balanceOf(user0).eq(testMint - swapAmount, "asset-balance");
        kiss.balanceOf(user0).gt(0, "kiss-balance");

        newAsset.totalSupply().eq(testMint, "asset-total-supply");
        KreskoAssetAnchor(assetConfig.anchor).totalSupply().eq(testMint, "anchor-total-supply");

        kresko.burnKreskoAsset(
            BurnArgs({krAsset: newAssetAddr, amount: burnAmount, account: user0, repayee: user0, mintIndex: 0}),
            new bytes[](0)
        );
        uint256 debtAmountAfterBurn = testMint - burnAmount;

        newAsset.balanceOf(user0).eq(testMint - swapAmount - burnAmount, "user0-balance-burn");

        kresko.getAccountDebtAmount(user0, newAssetAddr).eq(debtAmountAfterBurn, "user0-debt-amount-burn");
        kresko.getAccountTotalDebtValue(user0).eq(price.mulWad(debtAmountAfterBurn), "user0-debt-value-burn");

        newAsset.totalSupply().eq(debtAmountAfterBurn, "asset-total-supply-burn");
        KreskoAssetAnchor(assetConfig.anchor).totalSupply().eq(debtAmountAfterBurn, "anchor-total-supply-burn");

        prank(user1);
        kresko.mintKreskoAsset(
            MintArgs({krAsset: newAssetAddr, amount: testMint, account: user1, receiver: user0}),
            new bytes[](0)
        );

        newAsset.balanceOf(user0).eq(testMint - swapAmount - burnAmount + testMint, "user0-balance-user1-mint");
        newAsset.balanceOf(user1).eq(0 ether, "user1-balance-user1-mint");
        kresko.getAccountDebtAmount(user1, newAssetAddr).eq(testMint, "user1-debt-amount-user1-mint");
        kresko.getAccountTotalDebtValue(user1).eq(price.mulWad(testMint), "user1-debt-value-user1-mint");

        prank(user0);
        kresko.burnKreskoAsset(
            BurnArgs({krAsset: newAssetAddr, amount: debtAmountAfterBurn, account: user0, repayee: user0, mintIndex: 0}),
            new bytes[](0)
        );

        kresko.getAccountDebtAmount(user0, newAssetAddr).eq(0, "user0-debt-amount-burn-all");
        kresko.getAccountTotalDebtValue(user0).eq(0, "user0-debt-value-burn-all");
        kresko.getAccountMintedAssets(user0).length.eq(0, "user0-minted-assets-burn-all");
    }
}
