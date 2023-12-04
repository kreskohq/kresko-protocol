// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Asset, RawPrice} from "common/Types.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Help, Log} from "kresko-lib/utils/Libs.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {JSON, LibConfig} from "scripts/utils/libs/LibConfig.s.sol";
import {vm} from "kresko-lib/utils/IMinimalVM.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";

library LibOutput {
    using Log for *;
    using Help for *;

    string internal constant SCRIPT_LOCATION = "utils/deployUtils.js";

    function findAddress(address factory, string memory symbol, JSON.Assets memory _assetCfg) internal view returns (address) {
        for (uint256 i; i < _assetCfg.extAssets.length; i++) {
            if (_assetCfg.extAssets[i].symbol.equals(symbol)) {
                return _assetCfg.extAssets[i].addr;
            }
        }

        for (uint256 i; i < _assetCfg.kreskoAssets.length; i++) {
            if (_assetCfg.kreskoAssets[i].symbol.equals(symbol)) {
                return
                    IDeploymentFactory(factory).getCreate3Address(
                        LibConfig.getKrAssetMetadata(_assetCfg.kreskoAssets[i]).krAssetSalt
                    );
            }
        }

        revert("Asset not found");
    }

    function getAllTradeRoutes(
        SwapRouteSetter[] storage routes,
        address factory,
        address kiss,
        JSON.Assets memory cfg,
        mapping(bytes32 => bool) storage routesAdded
    ) internal {
        for (uint256 i; i < cfg.kreskoAssets.length; i++) {
            JSON.KrAssetConfig memory krAsset = cfg.kreskoAssets[i];
            address assetIn = findAddress(factory, krAsset.symbol, cfg);
            bytes32 kissPairId = LibConfig.pairId(kiss, assetIn);
            if (!routesAdded[kissPairId]) {
                routesAdded[kissPairId] = true;
                routes.push(SwapRouteSetter({assetIn: kiss, assetOut: assetIn, enabled: true}));
            }
            for (uint256 j; j < cfg.kreskoAssets.length; j++) {
                address assetOut = findAddress(factory, cfg.kreskoAssets[j].symbol, cfg);
                if (assetIn == assetOut) continue;
                bytes32 pairId = LibConfig.pairId(assetIn, assetOut);
                if (routesAdded[pairId]) continue;

                routesAdded[pairId] = true;
                routes.push(SwapRouteSetter({assetIn: assetIn, assetOut: assetOut, enabled: true}));
            }
        }
    }

    function getCustomTradeRoutes(SwapRouteSetter[] storage routes, address factory, JSON.Assets memory cfg) internal {
        for (uint256 i; i < cfg.customTradeRoutes.length; i++) {
            JSON.TradeRouteConfig memory tradeRoute = cfg.customTradeRoutes[i];
            routes.push(
                SwapRouteSetter({
                    assetIn: findAddress(factory, tradeRoute.assetA, cfg),
                    assetOut: findAddress(factory, tradeRoute.assetB, cfg),
                    enabled: tradeRoute.enabled
                })
            );
        }
    }

    function getKrAssetAddr(address factory, JSON.KrAssetConfig memory _assetCfg) internal view returns (address) {
        return IDeploymentFactory(factory).getCreate3Address(LibConfig.getKrAssetMetadata(_assetCfg).krAssetSalt);
    }

    function getDeployedAddr(string memory name, uint256 chainId) internal returns (address) {
        string[] memory args = new string[](5);
        args[0] = "node";
        args[1] = SCRIPT_LOCATION;
        args[2] = "getLatestDeployment";
        args[3] = name;
        args[4] = chainId.str();

        return vm.ffi(args).str().toAddr();
    }

    function printUser(address user, address kiss, JSON.Assets memory assetCfg, JSON.UserConfig memory cfg) internal {
        Log.br();
        Log.hr();
        Log.clg("Test User");
        user.clg("Address");
        Log.hr();
        emit Log.log_named_decimal_uint("Ether", user.balance, 18);
        for (uint256 i; i < assetCfg.extAssets.length; i++) {
            JSON.ExtAssetConfig memory asset = assetCfg.extAssets[i];
            IERC20 token = IERC20(asset.addr);
            uint256 balance = token.balanceOf(user);
            balance.dlg(token.symbol(), token.decimals());
        }
        IERC20(kiss).balanceOf(user).dlg("KISS", 18);
    }

    function print(Asset memory config, address kresko, address asset) internal {
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
        ([uint8(config.oracles[0]), uint8(config.oracles[1])]).clg("Oracle Types");

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
