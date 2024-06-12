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

    function setUp() public override {
        super.setUp();
        vm.createSelectFork("arbitrum", 221186410);

        createAddKrAsset();
        assetConfig = kresko.getAsset(newAssetAddr);
        newAsset = KreskoAsset(newAssetAddr);
        newAssetAnchor = KreskoAssetAnchor(assetConfig.anchor);

        fetchPythSync();

        prank(safe);
        kresko.setMaxPriceDeviationPct(25e2);

        (user0, user1) = (address(0x1234), address(0x4321));
        address[2] memory testUsers = [user0, user1];
        for (uint256 i; i < testUsers.length; i++) {
            address testUser = testUsers[i];

            deal(testUser, 1 ether);
            deal(USDCAddr, testUser, 10_000e6);
            dealERC1155(kreskianAddr, testUser, 0, 1);

            prank(testUser);
            approvals();
            newAsset.approve(kreskoAddr, type(uint256).max);
            kresko.depositCollateral(testUser, USDCAddr, 1000e6);
        }
    }

    function testSanityCheck() external {
        assetSymbol.eq(newAsset.symbol(), "asset-symbol");
        assetConfig.anchor.eq(newAsset.anchor(), "asset-anchor");
        newAsset.name().eq(string.concat("Kresko: ", assetName), "asset-name");
        newAssetAnchor.symbol().eq(string.concat("akr", assetTicker), "anchor-symbol");
        newAssetAnchor.name().eq(string.concat("Kresko Asset Anchor: ", assetName), "anchor-name");
    }

    function testPrice() external {
        uint256 primaryPrice = kresko.getPrice(newAssetAddr);
        uint256 secondaryPrice = uint256(kresko.getPushPrice(newAssetAddr).answer);

        uint256 ratio = primaryPrice.pctDiv(secondaryPrice);
        ratio.closeTo(100e2, 5e2, "price-ratio");
    }

    function testCoreActions() external pranked(user0) {
        uint256 amount100 = 100 ether;

        uint256 price = kresko.getPrice(newAssetAddr);

        kresko.mintKreskoAsset(
            MintArgs({krAsset: newAssetAddr, amount: amount100, account: user0, receiver: user0}),
            pythUpdate
        );
        kresko.getAccountMintedAssets(user0)[0].eq(newAssetAddr, "user0-minted-asset");
        kresko.getAccountDebtAmount(user0, newAssetAddr).eq(amount100, "user0-debt-amount");
        kresko.getAccountTotalDebtValue(user0).eq(price.mulWad(amount100), "user0-debt-value");

        kresko.swapSCDP(
            SwapArgs({
                assetIn: newAssetAddr,
                assetOut: kissAddr,
                amountIn: 10 ether,
                amountOutMin: 10 ether,
                receiver: user0,
                prices: new bytes[](0)
            })
        );

        kresko.getSwapDepositsSCDP(newAssetAddr).eq(10 ether, "swap-deposits");
        newAsset.balanceOf(kreskoAddr).eq(10 ether, "asset-balance");

        newAsset.balanceOf(user0).eq(90 ether, "asset-balance");
        kiss.balanceOf(user0).gt(10 ether, "kiss-balance");

        newAsset.totalSupply().eq(amount100, "asset-total-supply");
        KreskoAssetAnchor(assetConfig.anchor).totalSupply().eq(amount100, "anchor-total-supply");

        kresko.burnKreskoAsset(
            BurnArgs({krAsset: newAssetAddr, amount: 50 ether, account: user0, repayee: user0, mintIndex: 0}),
            new bytes[](0)
        );
        newAsset.balanceOf(user0).eq(40 ether, "user0-balance-burn");

        kresko.getAccountDebtAmount(user0, newAssetAddr).eq(50 ether, "user0-debt-amount-burn");
        kresko.getAccountTotalDebtValue(user0).eq(price.mulWad(50 ether), "user0-debt-value-burn");

        newAsset.totalSupply().eq(50 ether, "asset-total-supply-burn");
        KreskoAssetAnchor(assetConfig.anchor).totalSupply().eq(50 ether, "anchor-total-supply-burn");

        prank(user1);
        kresko.mintKreskoAsset(
            MintArgs({krAsset: newAssetAddr, amount: 10 ether, account: user1, receiver: user0}),
            new bytes[](0)
        );

        newAsset.balanceOf(user0).eq(50 ether, "user0-balance-user1-mint");
        newAsset.balanceOf(user1).eq(0 ether, "user1-balance-user1-mint");
        kresko.getAccountDebtAmount(user1, newAssetAddr).eq(10 ether, "user1-debt-amount-user1-mint");
        kresko.getAccountTotalDebtValue(user1).eq(price.mulWad(10 ether), "user1-debt-value-user1-mint");

        prank(user0);
        kresko.burnKreskoAsset(
            BurnArgs({krAsset: newAssetAddr, amount: 50 ether, account: user0, repayee: user0, mintIndex: 0}),
            new bytes[](0)
        );
        newAsset.balanceOf(user0).eq(0, "user0-balance-burn-all");
        kresko.getAccountDebtAmount(user0, newAssetAddr).eq(0, "user0-debt-amount-burn-all");
        kresko.getAccountTotalDebtValue(user0).eq(0, "user0-debt-value-burn-all");
        kresko.getAccountMintedAssets(user0).length.eq(0, "user0-minted-assets-burn-all");
    }
}
