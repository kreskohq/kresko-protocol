// SPDX-License-Identifier: MIT
// solhint-disable no-empty-blocks
pragma solidity <0.9.0;

import {Arrays} from "libs/Arrays.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {KISS} from "kiss/KISS.sol";
import {Enums} from "common/Constants.sol";
import {IKreskoForgeTypes} from "scripts/utils/IKreskoForgeTypes.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {ProxyFactory} from "proxy/ProxyFactory.sol";

import {Proxy} from "proxy/IProxyFactory.sol";
import {Asset} from "common/Types.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";
import {KreskoForgeUtils} from "../utils/KreskoForgeUtils.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Vault} from "vault/Vault.sol";

using Arrays for bytes32[];
using Arrays for address[];
using Arrays for string[];

abstract contract DeployContext is KreskoForgeUtils {
    struct AssetsOnChain {
        uint256 wethIndex;
        IKreskoForgeTypes.ExtAssetInfo[] ext;
        IKreskoForgeTypes.KrAssetInfo[] kra;
        VaultAsset[] vassets;
        string[] vaultSymbols;
        uint256 extAssetCount;
        uint256 krAssetCount;
        uint256 vaultAssetCount;
        IKreskoForgeTypes.KISSInfo kiss;
    }

    struct AssetCfg {
        uint256 wethIndex;
        ExtAssetCfg[] ext;
        KrAssetCfg[] kra;
        VaultAsset[] vassets;
        string[] vaultSymbols;
    }
    struct UserCfg {
        address addr;
        uint256[] bal;
    }

    struct KrAssetCfg {
        string name;
        string symbol;
        bytes32 ticker;
        address underlying;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        IKreskoForgeTypes.AssetType identity;
        bool setTickerFeeds;
    }

    struct ExtAssetCfg {
        bytes32 ticker;
        string symbol;
        IERC20 token;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        IKreskoForgeTypes.AssetType identity;
        bool setTickerFeeds;
    }

    constructor() {
        $.enableCtx();
    }

    modifier ctx() {
        if ($.ctx().enabled) {
            $.ctx().msgSender = LibTest.peekSender();
        }
        _;
    }

    function onConfigurationsCreated($.Ctx storage _ctx, CoreConfig memory _cfg, AssetCfg memory _assetCfg) internal virtual {}

    function onCoreContractsCreated($.Ctx storage _ctx) internal virtual {}

    function onContractsCreated($.Ctx storage _ctx) internal virtual {}

    function onKrAssetAdded($.Ctx storage _ctx, KrAssetInfo memory _onChainInfo) internal virtual {}

    function onExtAssetAdded($.Ctx storage _ctx, ExtAssetInfo memory _onChainInfo) internal virtual {}

    function onAssetsComplete($.Ctx storage _ctx, AssetsOnChain memory _onChainInfo) internal virtual {}

    function onComplete($.Ctx storage _ctx) internal virtual {}

    function afterAssetConfigs(AssetCfg memory _assetCfg) internal ctx {
        $.createAssetConfigsCtx(_assetCfg);
    }

    function afterCoreConfig(CoreConfig memory _cfg) internal ctx {
        require(_cfg.admin != address(0), "createCoreConfig: coreArgs should have some admin address set");
        onConfigurationsCreated($.createCoreConfigCtx((_cfg)), _cfg, $.ctx().assetCfg);
    }

    function beforeCreateCore(CoreConfig memory) internal ctx {
        $.handleBeforeCreateCoreCtx();
    }

    function afterCoreCreated(IKresko _kresko, ProxyFactory _proxyFactory) internal ctx {
        onCoreContractsCreated($.createCoreCtx(_kresko, _proxyFactory));
    }

    function afterVaultCreated(Vault _vault) internal ctx {
        $.createVaultCtx(_vault);
    }

    function handleNewKrAsset(KrAssetDeployInfo memory _deployment) internal {
        $.tokenCtx(_deployment.addr, _deployment.symbol);
        $.tokenCtx(address(_deployment.anchorProxy.proxy), _deployment.anchorSymbol);
        $.proxyCtx(_deployment.krAssetProxy, _deployment.symbol);
        $.proxyCtx(_deployment.anchorProxy, _deployment.anchorSymbol);
    }

    function afterKrAssetsCreated(KrAssetDeployInfo[] memory _deployments) internal ctx {
        require(_deployments.length > 0, "DevnetDeployContext: Should deploy some krAssets");
        for (uint256 i; i < _deployments.length; i++) {
            handleNewKrAsset(_deployments[i]);
        }

        onContractsCreated($.ctx());
    }

    function afterKISSCreated(KISSInfo memory _kissInfo, address _vaultAddr) internal ctx {
        $.createKISSCtx(_kissInfo, _vaultAddr);
    }

    function afterVaultAssetsComplete(
        AssetCfg memory _assetCfg,
        VaultAsset[] memory _onChainInfo
    ) internal ctx returns (AssetsOnChain memory) {
        return $.vaultAssetCompleteCtx(_assetCfg, _onChainInfo);
    }

    function afterKrAssetAdded(KrAssetInfo memory _onChainInfo) internal {
        onKrAssetAdded($.ctx(), _onChainInfo);
    }

    function afterKISSAdded(KISSInfo memory _onChainInfo) internal {
        KrAssetInfo memory _kissAsKrAsset;
        _kissAsKrAsset.addr = _onChainInfo.addr;
        _kissAsKrAsset.symbol = "KISS";
        _kissAsKrAsset.config = _onChainInfo.config;
        _kissAsKrAsset.krAssetProxy = _onChainInfo.proxy;
        _kissAsKrAsset.feedAddr = _onChainInfo.vaultAddr;
        onKrAssetAdded($.ctx(), _kissAsKrAsset);
    }

    function afterExtAssetAdded(ExtAssetInfo memory _onChainInfo) internal {
        onExtAssetAdded($.ctx(), _onChainInfo);
    }

    function afterAssetsComlete(AssetsOnChain memory _onChainInfo) internal ctx returns (AssetsOnChain memory result_) {
        result_ = $.assetsCompleteCtx(_onChainInfo);
        onAssetsComplete($.ctx(), result_);
    }
}

/// @dev general utility lib for network scripts
library $ {
    struct Ctx {
        mapping(uint256 => IKreskoForgeTypes.KrAssetInfo) krAssetAt;
        mapping(uint256 => IKreskoForgeTypes.ExtAssetInfo) extAssetAt;
        mapping(string => address) getAddress;
        mapping(string => Asset) getAsset;
        mapping(string => VaultAsset) getVAsset;
        mapping(string => IERC20) getToken;
        mapping(string => address) getFeed;
        mapping(string => IAggregatorV3) getVFeed;
        mapping(string => MockERC20) getMockToken;
        mapping(string => Proxy) getProxy;
        IKreskoForgeTypes.CoreConfig cfg;
        DeployContext.AssetCfg assetCfg;
        DeployContext.UserCfg[] userCfg;
        DeployContext.AssetsOnChain assetsOnChain;
        KISS kiss;
        IKresko kresko;
        Vault vault;
        ProxyFactory proxyFactory;
        Proxy[] allProxies;
        IERC20[] allTokens;
        address[] allFeeds;
        WETH9 weth;
        Asset[] allAssets;
        string[] allSymbols;
        bytes32[] allTickers;
        address deployer;
        address msgSender;
        bool enabled;
    }

    function enableCtx() internal {
        $.ctx().enabled = true;
    }

    function disableCtx() internal {
        $.ctx().enabled = false;
    }

    modifier check() {
        if (ctx().enabled) {
            _;
        }
    }

    function ctx() internal pure returns (Ctx storage ctx_) {
        bytes32 slot = keccak256("devnet.deploy.ctx");
        assembly {
            ctx_.slot := slot
        }
    }

    function handleBeforeCreateCoreCtx() internal check {
        $.ctx().deployer = LibTest.peekSender();
    }

    function createCoreCtx(IKresko _kresko, ProxyFactory _proxyFactory) internal returns (Ctx storage ctx_) {
        $.ctx().kresko = _kresko;
        $.ctx().proxyFactory = _proxyFactory;
        return ctx();
    }

    function createVaultCtx(Vault _vault) internal check {
        ctx().vault = _vault;
        tokenCtx(address(_vault), "vKISS");
        handleFeedCtx(address(_vault), "vKISS");
    }

    function createKISSCtx(IKreskoForgeTypes.KISSInfo memory _kissInfo, address _vaultAddr) internal check {
        ctx().kiss = _kissInfo.kiss;
        tokenCtx(address(_kissInfo.proxy.proxy), "KISS");
        proxyCtx(_kissInfo.proxy, "KISS");
        handleFeedCtx(_vaultAddr, "KISS");
    }

    function tokenCtx(address _token, string memory symbol) internal check {
        ctx().getAddress[symbol] = _token;
        ctx().getToken[symbol] = IERC20(_token);
        ctx().getMockToken[symbol] = MockERC20(_token);
        ctx().allTokens.push(IERC20(_token));
        ctx().allSymbols.pushUnique(symbol);
    }

    function handleFeedCtx(address _feed, string memory symbol) internal check {
        ctx().getFeed[symbol] = _feed;
        ctx().allFeeds.push(_feed);
    }

    function proxyCtx(Proxy memory _proxy, string memory symbol) internal check {
        ctx().getProxy[symbol] = _proxy;
        ctx().allProxies.push(_proxy);
    }

    function vaultAssetCompleteCtx(
        DeployContext.AssetCfg memory _assetCfg,
        VaultAsset[] memory _results
    ) internal returns (DeployContext.AssetsOnChain memory results_) {
        for (uint256 i; i < _results.length; i++) {
            ctx().getVAsset[_assetCfg.vaultSymbols[i]] = _results[i];
            ctx().assetsOnChain.vassets.push(_results[i]);
            ctx().assetsOnChain.vaultSymbols.pushUnique(_assetCfg.vaultSymbols[i]);
        }
        ctx().assetsOnChain.vaultAssetCount = _results.length;
        return ctx().assetsOnChain;
    }

    function assetsCompleteCtx(
        DeployContext.AssetsOnChain memory _results
    ) internal returns (DeployContext.AssetsOnChain memory results_) {
        for (uint256 i; i < _results.ext.length; i++) {
            handleProtocolAssetCtx(_results.ext[i].config, _results.ext[i].symbol);
            ctx().extAssetAt[i] = _results.ext[i];
            ctx().assetsOnChain.ext.push(_results.ext[i]);
        }
        for (uint256 i; i < _results.kra.length; i++) {
            handleProtocolAssetCtx(_results.kra[i].config, _results.kra[i].symbol);
            ctx().krAssetAt[i] = _results.kra[i];
            ctx().assetsOnChain.kra.push(_results.kra[i]);
        }

        ctx().assetsOnChain.kiss = _results.kiss;

        handleProtocolAssetCtx(_results.kiss.config, "KISS");
        handleProtocolAssetCtx(_results.kiss.config, "vKISS");

        ctx().assetsOnChain.extAssetCount = _results.ext.length;
        ctx().assetsOnChain.krAssetCount = _results.kra.length;
        ctx().weth = WETH9(payable(address(_results.ext[_results.wethIndex].token)));
        return ctx().assetsOnChain;
    }

    function handleProtocolAssetCtx(Asset memory _asset, string memory _symbol) internal check {
        ctx().getAsset[_symbol] = _asset;
        ctx().allAssets.push(_asset);
        ctx().allTickers.pushUnique(_asset.ticker);
    }

    function createCoreConfigCtx(IKreskoForgeTypes.CoreConfig memory _cfg) internal returns (Ctx storage ctx_) {
        if (ctx().enabled) {
            ctx().cfg = _cfg;
        }
        return ctx();
    }

    function createAssetConfigsCtx(DeployContext.AssetCfg memory _cfg) internal returns (Ctx storage ctx_) {
        if (ctx().enabled) {
            for (uint256 i; i < _cfg.ext.length; i++) {
                tokenCtx(address(_cfg.ext[i].token), _cfg.ext[i].symbol);
                handleFeedCtx(_cfg.ext[i].feeds[1], _cfg.ext[i].symbol);

                ctx().assetCfg.ext.push(_cfg.ext[i]);
            }
            for (uint256 i; i < _cfg.kra.length; i++) {
                handleFeedCtx(_cfg.ext[i].feeds[1], _cfg.ext[i].symbol);
                ctx().assetCfg.kra.push(_cfg.kra[i]);
            }

            for (uint256 i; i < _cfg.vassets.length; i++) {
                ctx().getVFeed[_cfg.vaultSymbols[i]] = _cfg.vassets[i].feed;
                ctx().allFeeds.push(address(_cfg.vassets[i].feed));

                ctx().assetCfg.vassets.push(_cfg.vassets[i]);
                ctx().assetCfg.vaultSymbols.push(_cfg.vaultSymbols[i]);
            }
            ctx().assetCfg.wethIndex = _cfg.wethIndex;
        }
        ctx().weth = WETH9(payable(address((_cfg.ext[_cfg.wethIndex].token))));
        return ctx();
    }

    function toStaticArr(uint256 _value) internal pure returns (uint256[1] memory fixed_) {
        return [_value];
    }

    function toArr(uint256 _value) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](1);
        dynamic_[0] = _value;
    }

    function dyn(uint256[1] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](1);
        dynamic_[0] = _fixed[0];
        return dynamic_;
    }

    function dyn(uint256[2] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](2);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        return dynamic_;
    }

    function dyn(uint256[3] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](3);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        return dynamic_;
    }

    function dyn(uint256[4] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](4);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        dynamic_[3] = _fixed[3];
        return dynamic_;
    }

    function dyn(uint256[5] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](5);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        dynamic_[3] = _fixed[3];
        dynamic_[4] = _fixed[4];
        return dynamic_;
    }

    function dyn(uint256[6] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](6);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        dynamic_[3] = _fixed[3];
        dynamic_[4] = _fixed[4];
        dynamic_[5] = _fixed[5];
        return dynamic_;
    }

    function dyn(uint32[6] memory _fixed) internal pure returns (uint32[] memory dynamic_) {
        dynamic_ = new uint32[](6);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        dynamic_[3] = _fixed[3];
        dynamic_[4] = _fixed[4];
        dynamic_[5] = _fixed[5];
        return dynamic_;
    }

    function dyn(uint256[7] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](7);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        dynamic_[3] = _fixed[3];
        dynamic_[4] = _fixed[4];
        dynamic_[5] = _fixed[5];
        dynamic_[6] = _fixed[6];
        return dynamic_;
    }

    function dyn(uint256[8] memory _fixed) internal pure returns (uint256[] memory dynamic_) {
        dynamic_ = new uint256[](8);
        dynamic_[0] = _fixed[0];
        dynamic_[1] = _fixed[1];
        dynamic_[2] = _fixed[2];
        dynamic_[3] = _fixed[3];
        dynamic_[4] = _fixed[4];
        dynamic_[5] = _fixed[5];
        dynamic_[6] = _fixed[6];
        dynamic_[7] = _fixed[7];
        return dynamic_;
    }
}