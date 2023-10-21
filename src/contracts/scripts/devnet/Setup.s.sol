// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import
// solhint-disable const-name-snakecase
// solhint-disable state-visibility
import {Enums} from "common/Constants.sol";
import {IKreskoForgeTypes} from "scripts/utils/IKreskoForgeTypes.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {KISS} from "kiss/KISS.sol";
import {Vault} from "vault/Vault.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {KreskoForgeUtils} from "../utils/KreskoForgeUtils.s.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {addr, tokens, cl} from "kresko-lib/info/Arbitrum.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";

using LibTest for string;

abstract contract DefaultAssets is ScriptBase, KreskoForgeUtils {
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
    /// @notice ETH, BTC, DAI, USDC, USDT
    function _createExtAssetConfig(
        IERC20[EXT_COUNT] memory _tokens,
        address[2][EXT_COUNT] memory _feeds
    ) internal view returns ($.ExtAsset[] memory ext_) {
        ext_ = new $.ExtAsset[](EXT_COUNT);
        ext_[0] = $.ExtAsset(bytes32("ETH"), _tokens[0], _feeds[0], OT_RS_CL, ext_default, false);
        ext_[1] = $.ExtAsset(bytes32("BTC"), _tokens[1], _feeds[1], OT_RS_CL, ext_default, false);
        ext_[2] = $.ExtAsset(bytes32("DAI"), _tokens[2], _feeds[2], OT_RS_CL, ext_default, true);
        ext_[3] = $.ExtAsset(bytes32("USDC"), _tokens[3], _feeds[3], OT_RS_CL, ext_default, true);
        ext_[4] = $.ExtAsset(bytes32("USDT"), _tokens[4], _feeds[4], OT_RS_CL, ext_default, true);
    }

    /// @notice ETH, BTC, EUR, JPY
    function _createKrAssetConfig(
        address[KR_COUNT] memory _underlyings,
        address[2][KR_COUNT] memory _feeds
    ) internal view returns ($.KrAsset[] memory kra_) {
        kra_ = new $.KrAsset[](KR_COUNT);
        kra_[0] = $.KrAsset("Kresko: Ether", "krETH", bytes32("ETH"), _underlyings[0], _feeds[0], OT_RS_CL, kr_default, true);
        kra_[1] = $.KrAsset("Kresko: Bitcoin", "krBTC", bytes32("BTC"), _underlyings[1], _feeds[1], OT_RS_CL, kr_default, true);
        kra_[2] = $.KrAsset("Kresko: Euro", "krEUR", bytes32("EUR"), _underlyings[2], _feeds[2], OT_RS_CL, kr_default, true);
        kra_[3] = $.KrAsset("Kresko: Yen", "krJPY", bytes32("JPY"), _underlyings[3], _feeds[3], OT_RS_CL, kr_default, true);
    }

    /// @notice DAI, USDC, USDT
    function _createVaultAssetConfig(
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
    /* ---------------------------------- users --------------------------------- */
    uint256 internal constant USER_COUNT = 6;
    struct TUser {
        address addr;
        uint256 daiAmt;
        uint256 usdcAmt;
        uint256 usdtAmt;
        uint256 wethAmt;
    }

    function prepareUsers(uint32[USER_COUNT] memory _idxs) internal virtual returns (TUser[USER_COUNT] memory) {
        return [
            TUser({addr: getAddr(_idxs[0]), daiAmt: 10000e18, usdcAmt: 10000e18, usdtAmt: 10000e6, wethAmt: 10000e18}), // deployer
            TUser({addr: getAddr(_idxs[1]), daiAmt: 0, usdcAmt: 0, usdtAmt: 0, wethAmt: 0}), // nothing
            TUser({addr: getAddr(_idxs[2]), daiAmt: 1e24, usdcAmt: 1e24, usdtAmt: 1e12, wethAmt: 100e18}), // a lot
            TUser({addr: getAddr(_idxs[3]), daiAmt: 50e18, usdcAmt: 10e18, usdtAmt: 5e6, wethAmt: 0.05e18}), // low
            _defaultUser(4),
            _defaultUser(5)
        ];
    }

    function _defaultUser(uint32 _idx) private returns (TUser memory) {
        return TUser({addr: getAddr(_idx), daiAmt: 10000 ether, usdcAmt: 1000 ether, usdtAmt: 800e6, wethAmt: 2.5 ether});
    }
}

abstract contract DevnetSetupBase is DefaultAssets {
    constructor(string memory _mnemonicId) DefaultAssets(_mnemonicId) {}

    KrAssetInfo[] internal KR_ASSETS;
    KISSInfo internal KISS_INFO;

    function createAssetConfig() internal virtual returns ($.Assets memory assetCfg_);

    function createCoreConfig() internal virtual returns (CoreConfig memory cfg_);

    function createCore(CoreConfig memory _cfg) internal returns (address kresko_) {
        require(_cfg.admin != address(0), "createCore: coreArgs should have some admin address set");
        kresko = deployDiamondOneTx(_cfg);
        proxyFactory = deployProxyFactory(_cfg.admin);
        return address(kresko);
    }

    function createVault(CoreConfig memory _cfg, address _kresko) internal virtual returns (address vault_) {
        require(_kresko != address(0), "createVault: Kresko should exist before createVault");
        vkiss = new Vault("vKISS", "vKISS", 18, 8, _cfg.treasury, address(_cfg.seqFeed));
        return address(vkiss);
    }

    function createKISS(
        CoreConfig memory _cfg,
        address _kresko,
        address _vault
    ) internal virtual returns (KISSInfo memory kiss_) {
        return deployKISS(_kresko, _vault, _cfg.admin);
    }

    function createKrAssets(
        CoreConfig memory _cfg,
        $.Assets memory _assetCfg
    ) internal virtual returns (KrAssetDeployInfo[] memory kraContracts_) {
        require(_assetCfg.kra.length > 0, "createKrAssets: No KrAssets defined");
        kraContracts_ = new KrAssetDeployInfo[](_assetCfg.kra.length);
        unchecked {
            for (uint256 i; i < _assetCfg.kra.length; i++) {
                kraContracts_[i] = deployKrAsset(
                    _assetCfg.kra[i].name,
                    _assetCfg.kra[i].symbol,
                    _assetCfg.kra[i].underlying,
                    _cfg.admin,
                    _cfg.treasury
                );
            }
        }
    }

    function configureVault($.Assets memory _assetCfg, address _vault) internal {
        require(_vault != address(0), "configureVault: vault needs to exist before configuring it");
        unchecked {
            for (uint256 i; i < _assetCfg.vault.length; i++) {
                Vault(_vault).addAsset(_assetCfg.vault[i]);
            }
        }
    }

    function configureAssets(
        $.Assets memory _assetCfg,
        KrAssetDeployInfo[] memory _kraContracts,
        KISSInfo memory _kiss
    ) internal virtual;

    function configureSwaps(address _kissAddr) internal virtual;

    // function configureUsers() internal virtual;
}

/**
 * @dev Base for Arbitrum Devnet:
 * @dev Implements the functions that are called by launch scripts
 */
abstract contract ArbitrumSetup is DevnetSetupBase {
    constructor(string memory _mnemonicId) DevnetSetupBase(_mnemonicId) {}

    function createAssetConfig() internal override returns ($.Assets memory assetCfg_) {
        WETH = tokens.WETH;
        IERC20 WETH20 = IERC20(address(WETH));

        feeds_eth = [address(0), addr.CL_ETH];
        feeds_btc = [address(0), addr.CL_BTC];
        feeds_dai = [address(0), addr.CL_DAI];
        feeds_eur = [address(0), addr.CL_EUR];
        feeds_usdc = [address(0), addr.CL_USDC];
        feeds_usdt = [address(0), addr.CL_USDT];
        feeds_jpy = [address(0), addr.CL_JPY];

        assetCfg_.ext = _createExtAssetConfig(
            [WETH20, tokens.WBTC, tokens.DAI, tokens.USDC, tokens.USDT],
            [feeds_eth, feeds_btc, feeds_dai, feeds_usdc, feeds_usdt]
        );
        assetCfg_.kra = _createKrAssetConfig(
            [address(WETH), address(tokens.WBTC), address(0), address(0)],
            [feeds_eth, feeds_btc, feeds_eur, feeds_jpy]
        );
        assetCfg_.vault = _createVaultAssetConfig([tokens.DAI, tokens.USDC, tokens.USDT], [cl.DAI, cl.USDC, cl.USDT]);

        return assetCfg_;
    }

    function createCoreConfig() internal override returns (CoreConfig memory cfg_) {
        address admin = getAddr(0);
        address treasury = getAddr(10);
        deployCfg = CoreConfig({
            admin: admin,
            seqFeed: addr.CL_SEQ_UPTIME,
            staleTime: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            council: getMockSafe(admin),
            treasury: treasury
        });
        return deployCfg;
    }

    function configureAssets(
        $.Assets memory _assetCfg,
        KrAssetDeployInfo[] memory _kraContracts,
        KISSInfo memory _kiss
    ) internal override {
        require(_kraContracts[0].addr != address(0), "configureAssets: krAssets not deployed");
        require(_kiss.addr != address(0), "configureAssets: KISS not deployed");
        require(_kiss.vaultAddr != address(0), "configureAssets: Vault not deployed");
        /* --------------------------- Whitelist krAssets --------------------------- */
        unchecked {
            for (uint256 i; i < _assetCfg.kra.length; i++) {
                KR_ASSETS.push(
                    addKrAsset(
                        _assetCfg.kra[i].ticker,
                        _assetCfg.kra[i].setTickerFeeds,
                        _assetCfg.kra[i].oracleType,
                        _assetCfg.kra[i].feeds,
                        _kraContracts[i],
                        _assetCfg.kra[i].identity
                    )
                );
            }
        }
        krETH = KR_ASSETS[0];
        krBTC = KR_ASSETS[1];
        krJPY = KR_ASSETS[2];
        krEUR = KR_ASSETS[3];
        /* ----------------------------- Whitelist KISS ----------------------------- */
        KISS_INFO = addKISS(_kiss);
        /* --------------------------- Whitelist externals -------------------------- */
        unchecked {
            for (uint256 i; i < _assetCfg.ext.length; i++) {
                addCollateral(
                    _assetCfg.ext[i].ticker,
                    address(_assetCfg.ext[i].token),
                    _assetCfg.ext[i].setTickerFeeds,
                    _assetCfg.ext[i].oracleType,
                    _assetCfg.ext[i].feeds,
                    _assetCfg.ext[i].identity
                );
            }
        }
    }

    function configureSwaps(address _kissAddr) internal override {
        kresko.setFeeAssetSCDP(_kissAddr);

        SwapRouteSetter[] memory routing = new SwapRouteSetter[](9);
        routing[0] = SwapRouteSetter({assetIn: _kissAddr, assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: _kissAddr, assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: _kissAddr, assetOut: krEUR.addr, enabled: true});

        routing[3] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krJPY.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krEUR.addr, enabled: true});

        routing[6] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krEUR.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krJPY.addr, enabled: true});

        routing[8] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krJPY.addr, enabled: true});
        kresko.setSwapRoutesSCDP(routing);

        // for full coverage, only JPY -> KISS and not KISS -> JPY
        kresko.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: _kissAddr, enabled: true})); //
    }
}

abstract contract LocalSetup is DevnetSetupBase {
    constructor(string memory _mnemonicId) DevnetSetupBase(_mnemonicId) {}

    MockTokenInfo internal mockWBTC;
    MockTokenInfo internal mockDAI;
    MockTokenInfo internal mockUSDC;
    MockTokenInfo internal mockUSDT;
    MockOracle internal mockFeedETH;
    MockOracle internal mockFeedEUR;
    MockOracle internal mockFeedJPY;

    function createAssetConfig() internal override returns ($.Assets memory assetCfg_) {
        WETH = IWETH9(address(new WETH9()));
        IERC20 WETH20 = IERC20(address(WETH));

        mockWBTC = deployMockTokenAndOracle(MockConfig("WBTC", price_btc, 8, 8, false));
        mockDAI = deployMockTokenAndOracle(MockConfig("DAI", price_dai, 18, 8, true));
        mockUSDC = deployMockTokenAndOracle(MockConfig("USDC", price_usdc, 18, 8, true));
        mockUSDT = deployMockTokenAndOracle(MockConfig("USDT", price_usdt, 6, 8, true));
        mockFeedETH = new MockOracle("ETH", price_eth, 8);
        mockFeedEUR = new MockOracle("EUR", price_eur, 8);
        mockFeedJPY = new MockOracle("JPY", price_jpy, 8);

        feeds_eth = [address(0), address(mockFeedETH)];
        feeds_eur = [address(0), address(mockFeedEUR)];
        feeds_jpy = [address(0), address(mockFeedJPY)];
        feeds_btc = [address(0), mockWBTC.feedAddr];
        feeds_dai = [address(0), mockDAI.feedAddr];
        feeds_usdc = [address(0), mockUSDC.feedAddr];
        feeds_usdt = [address(0), mockUSDT.feedAddr];

        assetCfg_.ext = _createExtAssetConfig(
            [WETH20, mockWBTC.asToken, mockDAI.asToken, mockUSDC.asToken, mockUSDT.asToken],
            [feeds_eth, feeds_btc, feeds_dai, feeds_usdc, feeds_usdt]
        );
        assetCfg_.kra = _createKrAssetConfig(
            [address(WETH), mockWBTC.addr, address(0), address(0)],
            [feeds_eth, feeds_btc, feeds_eur, feeds_jpy]
        );
        assetCfg_.vault = _createVaultAssetConfig(
            [mockDAI.asToken, mockUSDC.asToken, mockUSDT.asToken],
            [mockDAI.feed, mockUSDC.feed, mockUSDT.feed]
        );

        return assetCfg_;
    }

    function createCoreConfig() internal override returns (CoreConfig memory cfg_) {
        address admin = getAddr(0);
        address treasury = getAddr(10);
        deployCfg = CoreConfig({
            admin: admin,
            seqFeed: address(new MockSequencerUptimeFeed()),
            staleTime: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            council: getMockSafe(admin),
            treasury: TEST_TREASURY
        });
        return deployCfg;
    }

    function configureAssets(
        $.Assets memory _assetCfg,
        KrAssetDeployInfo[] memory _kraContracts,
        KISSInfo memory _kiss
    ) internal override {
        require(_kraContracts[0].addr != address(0), "configureAssets: krAssets not deployed");
        require(_kiss.addr != address(0), "configureAssets: KISS not deployed");
        require(_kiss.vaultAddr != address(0), "configureAssets: Vault not deployed");

        /* --------------------------- Whitelist krAssets --------------------------- */
        unchecked {
            for (uint256 i; i < _assetCfg.kra.length; i++) {
                KR_ASSETS.push(
                    addKrAsset(
                        _assetCfg.kra[i].ticker,
                        _assetCfg.kra[i].setTickerFeeds,
                        _assetCfg.kra[i].oracleType,
                        _assetCfg.kra[i].feeds,
                        _kraContracts[i],
                        _assetCfg.kra[i].identity
                    )
                );
            }
        }
        krETH = KR_ASSETS[0];
        krBTC = KR_ASSETS[1];
        krJPY = KR_ASSETS[2];
        krEUR = KR_ASSETS[3];
        /* ----------------------------- Whitelist KISS ----------------------------- */
        KISS_INFO = addKISS(_kiss);

        /* --------------------------- Whitelist externals -------------------------- */
        unchecked {
            for (uint256 i; i < _assetCfg.ext.length; i++) {
                addCollateral(
                    _assetCfg.ext[i].ticker,
                    address(_assetCfg.ext[i].token),
                    _assetCfg.ext[i].setTickerFeeds,
                    _assetCfg.ext[i].oracleType,
                    _assetCfg.ext[i].feeds,
                    _assetCfg.ext[i].identity
                );
            }
        }
    }

    function configureSwaps(address _kiss) internal override {
        kresko.setFeeAssetSCDP(_kiss);

        SwapRouteSetter[] memory routing = new SwapRouteSetter[](9);
        routing[0] = SwapRouteSetter({assetIn: _kiss, assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: _kiss, assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: _kiss, assetOut: krEUR.addr, enabled: true});

        routing[3] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krJPY.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krEUR.addr, enabled: true});

        routing[6] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krEUR.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krJPY.addr, enabled: true});

        routing[8] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krJPY.addr, enabled: true});
        kresko.setSwapRoutesSCDP(routing);

        // for full coverage, only JPY -> KISS and not KISS -> JPY
        kresko.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: _kiss, enabled: true})); //
    }
}

library $ {
    struct Assets {
        ExtAsset[] ext;
        KrAsset[] kra;
        VaultAsset[] vault;
    }
    struct KrAsset {
        string name;
        string symbol;
        bytes32 ticker;
        address underlying;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        IKreskoForgeTypes.AssetIdentity identity;
        bool setTickerFeeds;
    }

    struct ExtAsset {
        bytes32 ticker;
        IERC20 token;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        IKreskoForgeTypes.AssetIdentity identity;
        bool setTickerFeeds;
    }
}
