// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {RawPrice} from "common/Types.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {$, DeployContext} from "./DeployContext.s.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.sol";
import {console2} from "forge-std/Console2.sol";
import {KreskoForgeUtils} from "scripts/utils/KreskoForgeUtils.s.sol";

abstract contract DeployCallbacks is KreskoForgeUtils {
    function onConfigurationsCreated(
        $.Ctx storage _ctx,
        CoreConfig memory _cfg,
        DeployContext.AssetCfg memory _assetCfg,
        DeployContext.UserCfg[] memory _userCfg
    ) internal virtual {}

    function onCoreContractsCreated($.Ctx storage _ctx) internal virtual {}

    function onContractsCreated($.Ctx storage _ctx) internal virtual {}

    function onKrAssetAdded($.Ctx storage _ctx, KrAssetInfo memory _onChainInfo) internal virtual {}

    function onVaultAssetAdded($.Ctx storage _ctx, string memory _symbol, VaultAsset memory _onChainInfo) internal virtual {}

    function onExtAssetAdded($.Ctx storage _ctx, ExtAssetInfo memory _onChainInfo) internal virtual {}

    function onAssetsComplete($.Ctx storage _ctx, DeployContext.AssetsOnChain memory _onChainInfo) internal virtual {}

    function onDeploymentComplete($.Ctx storage _ctx) internal virtual {}

    function onComplete($.Ctx storage _ctx) internal virtual {}
}

abstract contract BaseLogger is DeployCallbacks, ScriptBase {
    bool log;

    // event log_named_decimal_int(string key, int256 val, uint256 decimals);
    // event log_named_decimal_uint(string key, uint256 val, uint256 decimals);

    function onConfigurationsCreated(
        $.Ctx storage _ctx,
        CoreConfig memory coreCfg,
        DeployContext.AssetCfg memory assetCfg,
        DeployContext.UserCfg[] memory userCfg
    ) internal override logEnabled {
        console2.log("/* ------------------------------- Deploying -------------------------------- */");
        super.logCallers();
        console2.log("/* ------------------------------ Configuration ----------------------------- */");
        console2.log("Admin: %s", coreCfg.admin);
        console2.log("Sequencer Feed: %s", coreCfg.seqFeed);
        console2.log("Council: %s", coreCfg.council);
        console2.log("Treasury: %s", coreCfg.treasury);
        emit log_named_decimal_uint("Minter MCR: ", coreCfg.minterMcr, 2);
        emit log_named_decimal_uint("Minter LT: ", coreCfg.minterLt, 2);
        emit log_named_decimal_uint("SCDP MCR: ", coreCfg.scdpMcr, 2);
        emit log_named_decimal_uint("SCDP LT: ", coreCfg.scdpLt, 2);
        console2.log("Oracle Stale Time: %s", coreCfg.staleTime);
        console2.log("Oracle Precision: %s", coreCfg.oraclePrecision);
        console2.log("SDI Precision: %s", coreCfg.sdiPrecision);
        console2.log("--------------------");
        console2.log("Total External Assets: ", assetCfg.ext.length);
        console2.log("Total Kresko Assets: ", assetCfg.kra.length);
        console2.log("Total Vault Assets: ", assetCfg.vassets.length);
        console2.log("--------------------");
        console2.log("Total Test Users: ", userCfg.length);
    }

    function onCoreContractsCreated($.Ctx storage _ctx) internal override logEnabled {
        console2.log("Diamond created @", address(_ctx.kresko));
        console2.log("DeploymentFactory @", address(_ctx.proxyFactory));
    }

    function onKrAssetAdded($.Ctx storage _ctx, KrAssetInfo memory _info) internal override logEnabled {
        console2.log("/* ------------------------------ Kresko Asset ------------------------------ */");
        console2.log("-------  Token --------");
        console2.log("Symbol:", _info.symbol);
        console2.log("Contract: ", _info.addr);
        console2.log("-------  Types --------");
        console2.log("Minter Mintable: ", _info.config.isMinterMintable ? "yes" : "no");
        console2.log("Minter Collateral: ", _info.config.isMinterCollateral ? "yes" : "no");
        console2.log("SCDP Swappable: ", _info.config.isSwapMintable ? "yes" : "no");
        console2.log("SCDP Depositable: ", _info.config.isSharedCollateral ? "yes" : "no");
        console2.log("-------  Oracle --------");
        RawPrice memory price = _ctx.kresko.getPushPrice(_info.addr);
        console2.log("Ticker:", string(abi.encodePacked(_info.config.ticker)));
        console2.log("Feed:", price.feed);
        emit log_named_decimal_uint("Feed Price", uint256(price.answer), 8);
        console2.log("Oracle Types:", uint8(_info.config.oracles[0]), uint8(_info.config.oracles[1]));
        console2.log("-------  Config --------");
        emit log_named_decimal_uint("kFactor", _info.config.kFactor, 2);
        emit log_named_decimal_uint("cFactor", _info.config.factor, 2);
        emit log_named_decimal_uint("Minter Open Fee", _info.config.openFee, 2);
        emit log_named_decimal_uint("Minter Close Fee", _info.config.closeFee, 2);
        emit log_named_decimal_uint("Minter Debt Limit", _info.config.maxDebtMinter, 18);
        emit log_named_decimal_uint("SCDP Swap In Fee", _info.config.swapInFeeSCDP, 2);
        emit log_named_decimal_uint("SCDP Swap Out Fee", _info.config.swapOutFeeSCDP, 2);
        emit log_named_decimal_uint("SCDP Protocol Fee", _info.config.protocolFeeShareSCDP, 2);
        emit log_named_decimal_uint("SCDP Debt Limit", _info.config.maxDebtSCDP, 18);
        emit log_named_decimal_uint("SCDP Liquidation Incentive", _info.config.liqIncentiveSCDP, 2);
    }

    function onExtAssetAdded($.Ctx storage _ctx, ExtAssetInfo memory _info) internal override logEnabled {
        console2.log("/* ----------------------------- External Asset ----------------------------- */");
        console2.log("-------  Token --------");
        console2.log("Symbol:", _info.symbol);
        console2.log("Contract: ", _info.addr);
        console2.log("-------  Types --------");
        console2.log("Minter Mintable: ", _info.config.isMinterMintable ? "yes" : "no");
        console2.log("Minter Collateral: ", _info.config.isMinterCollateral ? "yes" : "no");
        console2.log("SCDP Swappable: ", _info.config.isSwapMintable ? "yes" : "no");
        console2.log("SCDP Depositable: ", _info.config.isSharedCollateral ? "yes" : "no");
        console2.log("-------  Oracle --------");
        RawPrice memory price = _ctx.kresko.getPushPrice(_info.addr);
        console2.log("Ticker:", string(abi.encodePacked(_info.config.ticker)));
        console2.log("Feed:", price.feed);
        emit log_named_decimal_uint("Feed Price", uint256(price.answer), 8);
        console2.log("Oracle Types:", uint8(_info.config.oracles[0]), uint8(_info.config.oracles[1]));
        console2.log("-------  Config --------");
        emit log_named_decimal_uint("cFactor", _info.config.factor, 2);
        emit log_named_decimal_uint("kFactor", _info.config.kFactor, 2);
        emit log_named_decimal_uint("Liquidation Incentive", _info.config.liqIncentive, 2);
    }

    function onVaultAssetAdded(
        $.Ctx storage _ctx,
        string memory _symbol,
        VaultAsset memory _info
    ) internal override logEnabled {
        address assetAddr = address(_info.token);
        console2.log("/* ------------------------------- Vault Asset ------------------------------ */");
        console2.log("-------  Token --------");
        console2.log("Symbol:", _symbol);
        console2.log("Contract: ", assetAddr);
        console2.log("-------  Oracle --------");
        console2.log("Feed:", address(_info.feed));
        emit log_named_decimal_uint("Price", _ctx.vault.assetPrice(assetAddr), 8);
        console2.log("Stale Time", _info.staleTime);
        console2.log("-------  Config --------");
        console2.log("decimals", _info.decimals);
        emit log_named_decimal_uint("depositLimit", _info.maxDeposits, _info.decimals);
        emit log_named_decimal_uint("depositFee", _info.depositFee, 2);
        emit log_named_decimal_uint("withdrawFee", _info.withdrawFee, 2);
    }

    function onComplete($.Ctx storage _ctx) internal override logEnabled {
        console2.log("/* ------------------------------ +++++++++++++ ----------------------------- */");
        console2.log("");
        console2.log("/* -------------------------------- FINISHED -------------------------------- */");
        console2.log("");
        console2.log("/* ------------------------------ +++++++++++++ ----------------------------- */");
        for (uint256 j; j < _ctx.userCfg.length; j++) {
            console2.log("");
            console2.log("*** Test User %s: %s ***", j, _ctx.userCfg[j].addr);
            emit log_named_decimal_uint("Ether", _ctx.userCfg[j].addr.balance, 18);
            for (uint256 i; i < _ctx.assetsOnChain.ext.length; i++) {
                ExtAssetInfo memory asset = _ctx.assetsOnChain.ext[i];
                uint256 balance = asset.token.balanceOf(_ctx.userCfg[j].addr);
                emit log_named_decimal_uint(asset.symbol, balance, asset.config.decimals);
            }
        }
    }

    modifier logEnabled() {
        if (!log) return;
        _;
    }
}
