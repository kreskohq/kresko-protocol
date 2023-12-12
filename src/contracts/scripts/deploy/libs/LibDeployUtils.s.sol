// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Asset, RawPrice} from "common/Types.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;
import {toWad} from "common/funcs/Math.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";

library LibDeployUtils {
    using Log for *;
    using Help for *;
    using LibDeploy for *;
    using LibDeployConfig for *;
    using Deployed for *;

    function getAllTradeRoutes(
        JSON.Config memory json,
        SwapRouteSetter[] storage routes,
        mapping(bytes32 => bool) storage routeExists,
        address kiss
    ) internal {
        for (uint256 i; i < json.assets.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = json.assets.kreskoAssets[i];
            address assetIn = krAsset.symbol.cached();
            bytes32 kissPairId = kiss.pairId(assetIn);
            if (!routeExists[kissPairId]) {
                routeExists[kissPairId] = true;
                routes.push(SwapRouteSetter({assetIn: kiss, assetOut: assetIn, enabled: true}));
            }
            for (uint256 j; j < json.assets.kreskoAssets.length; j++) {
                address assetOut = json.assets.kreskoAssets[j].symbol.cached();
                if (assetIn == assetOut) continue;
                bytes32 pairId = assetIn.pairId(assetOut);
                if (routeExists[pairId]) continue;

                routeExists[pairId] = true;
                routes.push(SwapRouteSetter({assetIn: assetIn, assetOut: assetOut, enabled: true}));
            }
        }
    }

    function getCustomTradeRoutes(JSON.Config memory json, SwapRouteSetter[] storage routes) internal {
        for (uint256 i; i < json.assets.customTradeRoutes.length; i++) {
            JSON.TradeRouteConfig memory route = json.assets.customTradeRoutes[i];
            routes.push(
                SwapRouteSetter({assetIn: route.assetA.cached(), assetOut: route.assetA.cached(), enabled: route.enabled})
            );
        }
    }

    function logUserOutput(JSON.Config memory json, address user, IKresko kresko, address kiss) internal {
        if (LibDeploy.state().disableLog) return;
        Log.br();
        Log.hr();
        Log.clg("Test User");
        user.clg("Address");
        Log.hr();
        emit Log.log_named_decimal_uint("Ether", user.balance, 18);

        for (uint256 i; i < json.assets.extAssets.length; i++) {
            JSON.ExtAsset memory asset = json.assets.extAssets[i];
            IERC20 token = IERC20(asset.addr);

            uint256 balance = token.balanceOf(user);
            balance.dlg(token.symbol(), token.decimals());
            kresko.getAccountCollateralAmount(user, address(token)).dlg("MDeposit", token.decimals());
        }

        for (uint256 i; i < json.assets.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = json.assets.kreskoAssets[i];
            IERC20 token = IERC20(krAsset.symbol.cached());
            uint256 balance = token.balanceOf(user);

            balance.dlg(token.symbol(), token.decimals());
            kresko.getAccountCollateralAmount(user, address(token)).dlg("MDeposit", token.decimals());
            kresko.getAccountDebtAmount(user, address(token)).dlg("MDebt", token.decimals());
        }

        IERC20(kiss).balanceOf(user).dlg("KISS", 18);
        kresko.getDepositsSCDP(user).dlg("SCDP Deposits", 18);
    }

    function logOutput(JSON.Config memory json, IKresko kresko, address kiss) internal {
        if (LibDeploy.state().disableLog) return;
        Log.br();
        Log.hr();
        Log.clg("Protocol");
        Log.hr();
        for (uint256 i; i < json.assets.extAssets.length; i++) {
            JSON.ExtAsset memory asset = json.assets.extAssets[i];
            IERC20 token = IERC20(asset.addr);

            Log.hr();
            token.symbol().clg();

            uint256 tSupply = token.totalSupply();
            uint256 bal = token.balanceOf(address(kresko));
            uint256 price = uint256(kresko.getPushPrice(address(token)).answer);

            tSupply.dlg("Total Supply", token.decimals());
            uint256 wadSupply = toWad(tSupply, token.decimals());
            wadSupply.mulWad(price).dlg("Market Cap USD", 8);

            bal.dlg("Kresko Balance", token.decimals());

            uint256 wadBal = toWad(bal, token.decimals());
            wadBal.mulWad(price).dlg("Kresko Balance USD", 8);
        }
        for (uint256 i; i < json.assets.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = json.assets.kreskoAssets[i];
            IERC20 token = IERC20(krAsset.symbol.cached());

            Log.hr();
            token.symbol().clg();

            uint256 tSupply = token.totalSupply();
            uint256 balance = token.balanceOf(address(kresko));
            uint256 price = uint256(kresko.getPushPrice(address(token)).answer);
            tSupply.dlg("Total Minted", token.decimals());
            tSupply.mulWad(price).dlg("Market Cap USD", 8);
            balance.dlg("Kresko Balance", token.decimals());
            balance.mulWad(price).dlg("Kresko Balance USD", 8);
        }
        {
            Log.hr();
            ("KISS").clg();
            uint256 tSupply = IERC20(kiss).totalSupply();
            uint256 kissPrice = uint256(kresko.getPushPrice(kiss).answer);
            tSupply.dlg("Total Minted", 18);
            tSupply.mulWad(kissPrice).dlg("Market Cap USD", 8);

            IERC20(kiss).balanceOf(address(kresko)).dlg("Kresko Balance");
            uint256 scdpDeposits = kresko.getDepositsSCDP(kiss);
            scdpDeposits.dlg("SCDP Deposits", 18);
            scdpDeposits.mulWad(kissPrice).dlg("SCDP Deposits USD", 8);
        }
    }

    function logAsset(Asset memory config, address kresko, address asset) internal {
        if (LibDeploy.state().disableLog) return;
        IERC20 token = IERC20(asset);
        RawPrice memory price = IKresko(kresko).getPushPrice(asset);
        Log.br();

        ("/* ------------------------------ Protocol Asset ------------------------------ */").clg();
        token.symbol().clg("Symbol");
        asset.clg("Address");
        address(config.anchor).clg("Anchor");

        ("-------  Types --------").clg();
        config.isMinterMintable.clg("Minter Mintable");
        config.isMinterCollateral.clg("Minter Collateral");
        config.isSwapMintable.clg("SCDP Swappable");
        config.isSharedCollateral.clg("SCDP Depositable");

        ("-------  Oracle --------").clg();
        config.ticker.blg2txt("Ticker");
        price.feed.clg("Feed");
        uint256(price.answer).dlg("Feed Price", 8);
        uint8(config.oracles[0]).clg("Primary Oracle");
        uint8(config.oracles[1]).clg("Secondary Oracle");

        ("-------  Config --------").clg();
        config.maxDebtMinter.dlg("Minter Debt Limit", 18);
        config.maxDebtSCDP.dlg("SCDP Debt Limit", 18);
        config.kFactor.pct("kFactor");
        config.factor.pct("cFactor");
        config.openFee.pct("Minter Open Fee");
        config.closeFee.pct("Minter Close Fee");
        config.swapInFeeSCDP.pct("SCDP Swap In Fee");
        config.swapOutFeeSCDP.pct("SCDP Swap Out Fee");
        config.protocolFeeShareSCDP.pct("SCDP Protocol Fee");
        config.liqIncentiveSCDP.pct("SCDP Liquidation Incentive");
    }

    function logOutput(VaultAsset memory config, address vault) internal {
        if (LibDeploy.state().disableLog) return;
        address assetAddr = address(config.token);
        Log.br();
        ("/* ------------------------------- Vault Asset ------------------------------ */").clg();
        config.token.symbol().clg("Symbol");
        assetAddr.clg("Address");
        config.token.decimals().clg("Decimals");
        ("-------  Oracle --------").clg();
        address(config.feed).clg("Feed");
        IVault(vault).assetPrice(assetAddr).dlg("Price", 8);
        config.staleTime.clg("Stale Price Time");
        ("-------  Config --------").clg();
        config.maxDeposits.dlg("Max Deposit Amount", config.decimals);
        config.depositFee.pct("Deposit Fee");
        config.withdrawFee.pct("Withdraw Fee");
    }
}
