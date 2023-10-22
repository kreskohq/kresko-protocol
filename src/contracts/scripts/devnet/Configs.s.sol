// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import
// solhint-disable no-empty-blocks
// solhint-disable const-name-snakecase
// solhint-disable state-visibility

import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Vault} from "vault/Vault.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {ERC20} from "kresko-lib/token/ERC20.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.sol";
import {$, DeployContext} from "./DeployContext.s.sol";

abstract contract DevnetDeployer is DeployContext {
    function createAssetConfigs() internal virtual returns (AssetCfg memory assetCfg_);

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

abstract contract DefaultConfig is ScriptBase, DevnetDeployer {
    using $ for *;

    constructor(string memory _mnemonicId) ScriptBase(_mnemonicId) {}

    uint256 constant EXT_COUNT = 5;
    uint256 constant KR_COUNT = 4;
    uint256 constant VAULT_COUNT = 3;
    /* --------------------------------- assets --------------------------------- */
    IWETH9 internal WETH;
    IERC20 internal WBTC;
    IERC20 internal DAI;
    IERC20 internal USDC;
    IERC20 internal USDT;
    /* ------------------------------------ . ----------------------------------- */
    KrAssetInfo internal krETH;
    KrAssetInfo internal krBTC;
    KrAssetInfo internal krJPY;
    KrAssetInfo internal krEUR;
    /* ------------------------------------ . ----------------------------------- */
    address[2] internal feeds_eth;
    address[2] internal feeds_btc;
    address[2] internal feeds_eur;
    address[2] internal feeds_dai;
    address[2] internal feeds_usdt;
    address[2] internal feeds_usdc;
    address[2] internal feeds_jpy;
    /* ------------------------------------ . ----------------------------------- */
    uint256 constant price_eth = 2000e8;
    uint256 constant price_btc = 27662e8;
    uint256 constant price_dai = 1e8;
    uint256 constant price_eur = 106e8;
    uint256 constant price_usdc = 1e8;
    uint256 constant price_usdt = 1e8;
    uint256 constant price_jpy = 0.0067e8;
    /* ------------------------------------ . ----------------------------------- */
    string constant price_eth_rs = "ETH:1590:8";
    string constant price_btc_rs = "BTC:27662:8";
    string constant price_eur_rs = "EUR:1.06:8";
    string constant price_dai_rs = "DAI:1:8";
    string constant price_usdc_rs = "USDC:1:8";
    string constant price_usdt_rs = "USDT:1:8";
    string constant price_jpy_rs = "JPY:0.0067:8";

    /* -------------------------------------------------------------------------- */
    /*                                  Handlers                                  */
    /* -------------------------------------------------------------------------- */

    /// @notice ETH, BTC, DAI, USDC, USDT
    function EXT_ASSET_CONFIG(
        IERC20[EXT_COUNT] memory _tokens,
        string[EXT_COUNT] memory _sym,
        address[2][EXT_COUNT] memory _feeds
    ) internal view returns (ExtAssetCfg[] memory ext_) {
        ext_ = new ExtAssetCfg[](EXT_COUNT);
        ext_[0] = ExtAssetCfg(bytes32("ETH"), _sym[0], _tokens[0], _feeds[0], OT_RS_CL, ext_default, false);
        ext_[1] = ExtAssetCfg(bytes32("BTC"), _sym[1], _tokens[1], _feeds[1], OT_RS_CL, ext_default, false);
        ext_[2] = ExtAssetCfg(bytes32("DAI"), _sym[2], _tokens[2], _feeds[2], OT_RS_CL, ext_default, true);
        ext_[3] = ExtAssetCfg(bytes32("USDC"), _sym[3], _tokens[3], _feeds[3], OT_RS_CL, ext_default, true);
        ext_[4] = ExtAssetCfg(bytes32("USDT"), _sym[4], _tokens[4], _feeds[4], OT_RS_CL, ext_default, true);
    }

    /// @notice ETH, BTC, EUR, JPY
    function KR_ASSET_CONFIG(
        address[KR_COUNT] memory _ulying,
        address[2][KR_COUNT] memory _feeds
    ) internal view returns (KrAssetCfg[] memory kra_) {
        kra_ = new KrAssetCfg[](KR_COUNT);
        kra_[0] = KrAssetCfg("Kresko: Ether", "krETH", bytes32("ETH"), _ulying[0], _feeds[0], OT_RS_CL, kr_default, true);
        kra_[1] = KrAssetCfg("Kresko: Bitcoin", "krBTC", bytes32("BTC"), _ulying[1], _feeds[1], OT_RS_CL, kr_default, true);
        kra_[2] = KrAssetCfg("Kresko: Euro", "krEUR", bytes32("EUR"), _ulying[2], _feeds[2], OT_RS_CL, kr_default, true);
        kra_[3] = KrAssetCfg("Kresko: Yen", "krJPY", bytes32("JPY"), _ulying[3], _feeds[3], OT_RS_CL, kr_default, true);
    }

    /// @notice DAI, USDC, USDT
    function VAULT_ASSET_CONFIG(
        IERC20[VAULT_COUNT] memory _tokens,
        IAggregatorV3[VAULT_COUNT] memory _feeds
    ) internal pure returns (VaultAsset[] memory vault_) {
        vault_ = new VaultAsset[](3);
        vault_[0] = VaultAsset({
            token: _tokens[0],
            feed: _feeds[0],
            staleTime: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
            maxDeposits: type(uint248).max,
            enabled: true
        });
        vault_[1] = VaultAsset({
            token: _tokens[1],
            feed: _feeds[1],
            staleTime: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
            maxDeposits: type(uint248).max,
            enabled: true
        });
        vault_[2] = VaultAsset({
            token: _tokens[2],
            feed: _feeds[2],
            staleTime: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
            maxDeposits: type(uint248).max,
            enabled: true
        });
    }

    function configureAssets(
        AssetCfg memory _assetCfg,
        KrAssetDeployInfo[] memory _kraContracts,
        KISSInfo memory _kiss,
        address _kreskoAddr
    ) internal virtual override returns (AssetsOnChain memory results_) {
        results_ = super.configureAssets(_assetCfg, _kraContracts, _kiss, _kreskoAddr);

        krETH = results_.kra[0];
        krBTC = results_.kra[1];
        krEUR = results_.kra[2];
        krJPY = results_.kra[3];

        WETH = IWETH9(results_.ext[0].addr);
        WBTC = results_.ext[1].token;
        DAI = results_.ext[2].token;
        USDC = results_.ext[3].token;
        USDT = results_.ext[4].token;
    }

    /* ---------------------------------- users --------------------------------- */
    uint256 internal constant USER_COUNT = 6;

    function createUserConfig(uint32[USER_COUNT] memory _idxs) internal returns (UserCfg[] memory userCfg_) {
        userCfg_ = new UserCfg[](USER_COUNT);

        uint256[EXT_COUNT][] memory bals = new uint256[EXT_COUNT][](USER_COUNT);
        bals[0] = [uint256(100 ether), 10e18, 10000e18, 10000e18, 10000e6]; // deployer
        bals[1] = [uint256(0), 0, 0, 0, 0]; // nothing
        bals[2] = [uint256(100 ether), 10e18, 1e24, 1e24, 1e12]; // a lot
        bals[3] = [uint256(0.05 ether), 0.01e18, 50e18, 10e18, 5e6]; // low
        bals[4] = [uint256(2 ether), 0.05e18, 3000e18, 1000e18, 800e6];
        bals[5] = [uint256(2 ether), 0.05e18, 3000e18, 1000e18, 800e6];

        return createUserConfig(_idxs.dyn(), bals);
    }

    function createUserConfig(
        uint32[] memory _idxs,
        uint256[EXT_COUNT][] memory _bals
    ) internal view returns (UserCfg[] memory userCfg_) {
        require(_idxs.length == _bals.length, "createUserConfig: idxs and bals length mismatch");
        userCfg_ = new UserCfg[](_idxs.length);
        unchecked {
            for (uint256 i; i < _idxs.length; i++) {
                userCfg_[i] = UserCfg(getAddr(_idxs[i]), _bals[i].dyn());
            }
        }
    }
}
