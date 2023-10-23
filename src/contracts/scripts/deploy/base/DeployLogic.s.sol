// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {Vault} from "vault/Vault.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {ERC20} from "kresko-lib/token/ERC20.sol";
import {DeployContext} from "./DeployContext.s.sol";

abstract contract DeployLogicBase is DeployContext {
    function createAssetConfig() internal virtual returns (AssetCfg memory assetCfg_);

    function createCoreConfig() internal virtual returns (CoreConfig memory cfg_);

    function createCore(CoreConfig memory _cfg) internal returns (address kreskoAddr_) {
        require(_cfg.admin != address(0), "createCoreConfig: coreArgs should have some admin address set");

        super.beforeCreateCore(_cfg);

        kresko = super.deployDiamondOneTx(_cfg);
        kreskoAddr_ = address(kresko);

        proxyFactory = super.deployProxyFactory(_cfg.admin);

        super.afterCoreCreated(kresko, proxyFactory);
    }

    function createVault(CoreConfig memory _cfg, address _kreskoAddr) internal returns (address vaultAddr_) {
        require(_kreskoAddr != address(0), "createVault: Kresko should exist before createVault");
        vkiss = new Vault("vKISS", "vKISS", 18, 8, _cfg.treasury, address(_cfg.seqFeed));
        super.afterVaultCreated(vkiss);
        return address(vkiss);
    }

    function createKISS(
        CoreConfig memory _cfg,
        address _kreskoAddr,
        address _vaultAddr
    ) internal ctx returns (KISSInfo memory kissInfo_) {
        kissInfo_ = super.deployKISS(_kreskoAddr, _vaultAddr, _cfg.admin);

        super.afterKISSCreated(kissInfo_, _vaultAddr);
    }

    function createKrAssets(
        CoreConfig memory _cfg,
        AssetCfg memory _assetCfg
    ) internal ctx returns (KrAssetDeployInfo[] memory krAssetInfos_) {
        require(_assetCfg.kra.length > 0, "createKrAssets: No KrAssets defined");
        krAssetInfos_ = new KrAssetDeployInfo[](_assetCfg.kra.length);

        unchecked {
            for (uint256 i; i < _assetCfg.kra.length; i++) {
                krAssetInfos_[i] = super.deployKrAsset(
                    _assetCfg.kra[i].name,
                    _assetCfg.kra[i].symbol,
                    _assetCfg.kra[i].underlying,
                    _cfg.admin,
                    _cfg.treasury
                );
            }
        }

        super.afterKrAssetsCreated(krAssetInfos_);
    }

    function configureVaultAssets(
        AssetCfg memory _assetCfg,
        address _vaultAddr
    ) internal returns (AssetsOnChain memory vAssetsOnChain_) {
        require(_vaultAddr != address(0), "configureVault: vault needs to exist before configuring it");
        VaultAsset[] memory vAssetsOnChain = new VaultAsset[](_assetCfg.vassets.length);
        unchecked {
            for (uint256 i; i < _assetCfg.vassets.length; i++) {
                vAssetsOnChain[i] = Vault(_vaultAddr).addAsset(_assetCfg.vassets[i]);
            }
        }

        return super.afterVaultAssetsComplete(_assetCfg, vAssetsOnChain);
    }

    function configureAssets(
        AssetCfg memory _assetCfg,
        KrAssetDeployInfo[] memory _kraContracts,
        KISSInfo memory _kiss,
        address _kreskoAddr
    ) internal virtual ctx returns (AssetsOnChain memory assetsOnChain_) {
        require(_kraContracts[0].addr != address(0), "configureAssets: krAssets not deployed");
        require(_kiss.addr != address(0), "configureAssets: KISS not deployed");
        require(_kiss.vaultAddr != address(0), "configureAssets: Vault not deployed");

        assetsOnChain_.kra = new KrAssetInfo[](_assetCfg.kra.length);
        assetsOnChain_.ext = new ExtAssetInfo[](_assetCfg.ext.length);
        assetsOnChain_.wethIndex = _assetCfg.wethIndex;

        /* --------------------------- Whitelist krAssets --------------------------- */
        unchecked {
            for (uint256 i; i < _assetCfg.kra.length; i++) {
                assetsOnChain_.kra[i] = super.addKrAsset(
                    _assetCfg.kra[i].ticker,
                    _assetCfg.kra[i].setTickerFeeds,
                    _assetCfg.kra[i].oracleType,
                    _assetCfg.kra[i].feeds,
                    _kraContracts[i],
                    _assetCfg.kra[i].identity
                );
                super.afterKrAssetAdded(assetsOnChain_.kra[i]);
            }
        }

        /* ----------------------------- Whitelist KISS ----------------------------- */
        assetsOnChain_.kiss = super.addKISS(_kreskoAddr, _kiss);

        super.afterKISSAdded(assetsOnChain_.kiss);

        /* --------------------------- Whitelist externals -------------------------- */
        unchecked {
            for (uint256 i; i < _assetCfg.ext.length; i++) {
                address assetAddr = address(_assetCfg.ext[i].token);
                address feedAddr = address(_assetCfg.ext[i].feeds[1]);
                assetsOnChain_.ext[i] = ExtAssetInfo(
                    assetAddr,
                    _assetCfg.ext[i].symbol,
                    super.addCollateral(
                        _assetCfg.ext[i].ticker,
                        assetAddr,
                        _assetCfg.ext[i].setTickerFeeds,
                        _assetCfg.ext[i].oracleType,
                        _assetCfg.ext[i].feeds,
                        _assetCfg.ext[i].identity
                    ),
                    IAggregatorV3(feedAddr),
                    feedAddr,
                    ERC20(assetAddr)
                );
                super.afterExtAssetAdded(assetsOnChain_.ext[i]);
            }
        }

        return super.afterAssetsComlete(assetsOnChain_);
    }

    function configureSwaps(address _kreskoAddr, address _kissAddr) internal virtual;

    function configureUsers(UserCfg[] memory _usersCfg, AssetsOnChain memory _assetsOnChain) internal virtual;
}
