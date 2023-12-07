// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Asset, RawPrice} from "common/Types.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {mvm} from "kresko-lib/utils/MinVm.s.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;
import {toWad} from "common/funcs/Math.sol";

library Deployed {
    using Log for *;
    using Help for *;
    using LibDeploy for address;

    string internal constant SCRIPT_LOCATION = "utils/deployUtils.js";

    function tokenAddrRuntime(string memory symbol, JSON.Assets memory _assetCfg) internal returns (address) {
        for (uint256 i; i < _assetCfg.extAssets.length; i++) {
            if (_assetCfg.extAssets[i].symbol.equals(symbol)) {
                return _assetCfg.extAssets[i].addr;
            }
        }

        for (uint256 i; i < _assetCfg.kreskoAssets.length; i++) {
            if (_assetCfg.kreskoAssets[i].symbol.equals(symbol)) {
                return krAssetAddr(_assetCfg.kreskoAssets[i]);
            }
        }

        revert("Asset not found");
    }

    function getAllTradeRoutes(
        SwapRouteSetter[] storage routes,
        address kiss,
        JSON.Assets memory cfg,
        mapping(bytes32 => bool) storage routesAdded
    ) internal {
        for (uint256 i; i < cfg.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = cfg.kreskoAssets[i];
            address assetIn = tokenAddrRuntime(krAsset.symbol, cfg);
            bytes32 kissPairId = LibDeployConfig.pairId(kiss, assetIn);
            if (!routesAdded[kissPairId]) {
                routesAdded[kissPairId] = true;
                routes.push(SwapRouteSetter({assetIn: kiss, assetOut: assetIn, enabled: true}));
            }
            for (uint256 j; j < cfg.kreskoAssets.length; j++) {
                address assetOut = tokenAddrRuntime(cfg.kreskoAssets[j].symbol, cfg);
                if (assetIn == assetOut) continue;
                bytes32 pairId = LibDeployConfig.pairId(assetIn, assetOut);
                if (routesAdded[pairId]) continue;

                routesAdded[pairId] = true;
                routes.push(SwapRouteSetter({assetIn: assetIn, assetOut: assetOut, enabled: true}));
            }
        }
    }

    function getCustomTradeRoutes(SwapRouteSetter[] storage routes, JSON.Assets memory cfg) internal {
        for (uint256 i; i < cfg.customTradeRoutes.length; i++) {
            JSON.TradeRouteConfig memory tradeRoute = cfg.customTradeRoutes[i];
            routes.push(
                SwapRouteSetter({
                    assetIn: tokenAddrRuntime(tradeRoute.assetA, cfg),
                    assetOut: tokenAddrRuntime(tradeRoute.assetB, cfg),
                    enabled: tradeRoute.enabled
                })
            );
        }
    }

    function krAssetAddr(JSON.KrAssetConfig memory _assetCfg) internal returns (address) {
        return LibDeploy.pd3(_assetCfg.metadata().krAssetSalt);
    }

    function addr(string memory name) internal returns (address) {
        return addr(name, block.chainid);
    }

    function addr(string memory name, uint256 chainId) internal returns (address) {
        string[] memory args = new string[](5);
        args[0] = "node";
        args[1] = SCRIPT_LOCATION;
        args[2] = "getDeployment";
        args[3] = name;
        args[4] = chainId.str();

        return mvm.ffi(args).str().toAddr();
    }

    function printUser(address user, IKresko kresko, address kiss, JSON.Assets memory assets) internal {
        if (LibDeploy.state().disableLog) return;
        Log.br();
        Log.hr();
        Log.clg("Test User");
        user.clg("Address");
        Log.hr();
        emit Log.log_named_decimal_uint("Ether", user.balance, 18);
        for (uint256 i; i < assets.extAssets.length; i++) {
            JSON.ExtAssetConfig memory asset = assets.extAssets[i];
            IERC20 token = IERC20(asset.addr);
            uint256 balance = token.balanceOf(user);
            balance.dlg(token.symbol(), token.decimals());
            kresko.getAccountCollateralAmount(user, address(token)).dlg("MDeposit", token.decimals());
        }
        for (uint256 i; i < assets.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = assets.kreskoAssets[i];
            IERC20 token = IERC20(tokenAddrRuntime(krAsset.symbol, assets));
            uint256 balance = token.balanceOf(user);
            balance.dlg(token.symbol(), token.decimals());
            kresko.getAccountCollateralAmount(user, address(token)).dlg("MDeposit", token.decimals());
            kresko.getAccountDebtAmount(user, address(token)).dlg("MDebt", token.decimals());
        }
        IERC20(kiss).balanceOf(user).dlg("KISS", 18);
        kresko.getDepositsSCDP(user).dlg("SCDP Deposits", 18);
    }

    function printProtocol(JSON.Assets memory assets, IKresko kresko, address kiss) internal {
        if (LibDeploy.state().disableLog) return;
        Log.br();
        Log.hr();
        Log.clg("Protocol");
        Log.hr();
        for (uint256 i; i < assets.extAssets.length; i++) {
            JSON.ExtAssetConfig memory asset = assets.extAssets[i];
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
        for (uint256 i; i < assets.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = assets.kreskoAssets[i];
            IERC20 token = IERC20(tokenAddrRuntime(krAsset.symbol, assets));

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
            uint256 scdpDeposits = kresko.getDepositsSCDP(address(kiss));
            scdpDeposits.dlg("SCDP Deposits", 18);
            scdpDeposits.mulWad(kissPrice).dlg("SCDP Deposits USD", 8);
        }
    }

    function print(Asset memory config, address kresko, address asset) internal {
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

    function print(VaultAsset memory config, address vault) internal {
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
