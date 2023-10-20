// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import
// solhint-disable const-name-snakecase
// solhint-disable state-visibility

import {WETH9} from "kresko-lib/token/WETH9.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {ERC20} from "kresko-lib/token/ERC20.sol";
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

/**
 * @dev Common things for networks:
 * # KreskoForgeUtils: Contains core protocol deployment logic
 * # ScriptBase: Mainly for wallet utils
 * # Test user configuration
 * # KISS config storage
 */
abstract contract DevnetSetupBase is ScriptBase, KreskoForgeUtils {
    uint256 internal constant USER_COUNT = 6;
    uint256 internal constant EXT_ASSET_COUNT = 5;
    uint256 internal constant COLLATERAL_COUNT = 5;
    uint256 internal constant KR_ASSET_COUNT = 4;
    uint256 internal constant VAULT_ASSET_COUNT = 3;
    /* ----------------------------- External assets ---------------------------- */
    WETH9 internal WETH = tokens.WETH;
    IERC20 internal WBTC = tokens.WBTC;
    IERC20 internal DAI = tokens.DAI;
    IERC20 internal USDC = tokens.USDC;
    IERC20 internal USDT = tokens.USDT;
    /* ------------------------------- Collaterals ------------------------------ */
    // All externals are collateral
    /* -------------------------------- KrAssets -------------------------------- */
    KrDeployExtended internal krETH;
    KrDeployExtended internal krBTC;
    KrDeployExtended internal krJPY;
    KrDeployExtended internal krEUR;
    /* --------------------------------- Prices --------------------------------- */
    string constant btcPrice = "BTC:27662:8";
    string constant ethPrice = "ETH:1590:8";
    string constant eurPrice = "EUR:1.06:8";
    string constant daiPrice = "DAI:1:8";
    string constant usdcPrice = "USDC:1:8";
    string constant usdtPrice = "USDT:1:8";
    string constant jpyPrice = "JPY:0.0067:8";
    string constant initialPrices =
        btcPrice.and(ethPrice).and(daiPrice).and(usdcPrice).and(usdtPrice).and(eurPrice).and(jpyPrice);

    /* ------------------------------ Configuration ----------------------------- */
    function getCollaterals() internal view virtual returns (ExtDef[COLLATERAL_COUNT] memory);

    function getKrAssets() internal view virtual returns (KrAssetDef[COLLATERAL_COUNT] memory);

    function getVaultAssets() internal view virtual returns (VaultAsset[VAULT_ASSET_COUNT] memory);

    function getCoreConfig() internal virtual returns (DeployArgs memory coreArgs_);

    /* ---------------------- Deployment + Setup (in order) --------------------- */
    function createCore(DeployArgs memory _coreArgs) public virtual returns (address kresko_);

    function createVault(address _kresko) internal virtual returns (address vault_);

    function createKISS(address _vault) internal virtual returns (address kiss_);

    function createKrAssets(
        KrAssetDef[KR_ASSET_COUNT] memory _krAssets
    ) internal virtual returns (KrDeploy[KR_ASSET_COUNT] memory krAssets_);

    function configureAssets(KrDeploy[KR_ASSET_COUNT] memory _krAssets) internal virtual;

    function configureVault(VaultAsset[VAULT_ASSET_COUNT] memory _vaultAssets) internal virtual;

    function configureSwaps() internal virtual;

    function setupTestUsers() internal virtual;

    /* -------------------------------- Periphery ------------------------------- */
    TestUserConfig[USER_COUNT] internal users;
    KISSConfig internal kissConfig;

    /* ----------------------------- User configuration ---------------------------- */
    function getDefaultUsers() internal virtual returns (address[USER_COUNT] memory) {
        users = [
            TestUserConfig({ // deployer
                addr: getAddr(0),
                daiBalance: 100000 ether,
                usdcBalance: 100000 ether,
                usdtBalance: 100000e6,
                wethBalance: 100000 ether
            }),
            TestUserConfig({addr: getAddr(1), daiBalance: 0, usdcBalance: 0, usdtBalance: 0, wethBalance: 0}), // nothing
            TestUserConfig({addr: getAddr(2), daiBalance: 1e24, usdcBalance: 1e24, usdtBalance: 1e12, wethBalance: 100e18}), // a lot
            TestUserConfig({ // low
                addr: getAddr(3),
                daiBalance: 50 ether,
                usdcBalance: 10 ether,
                usdtBalance: 5e6,
                wethBalance: 0.05 ether
            }),
            defaultTestUser(4), // default
            defaultTestUser(5) // default
        ];
        return [users[0].addr, users[1].addr, users[2].addr, users[3].addr, users[4].addr, users[5].addr];
    }

    function defaultTestUser(uint32 mnemonicIndex) private returns (TestUserConfig memory) {
        return
            TestUserConfig({
                addr: getAddr(mnemonicIndex),
                daiBalance: 10000 ether,
                usdcBalance: 1000 ether,
                usdtBalance: 800e6,
                wethBalance: 2.5 ether
            });
    }

    constructor(string memory _mnemonicId) ScriptBase(_mnemonicId) {}
}

/**
 * @dev Base for Arbitrum Devnet:
 * @dev Implements the functions that are called by launch scripts
 */
abstract contract ArbitrumSetup is DevnetSetupBase {
    function getCollaterals() internal view override returns (ExtDef[COLLATERAL_COUNT] memory) {
        return [
            ExtDef(bytes32("DAI"), DAI, DAI_FEEDS, OT_RS_CL, defaultCollateral, true),
            ExtDef(bytes32("USDT"), USDT, USDT_FEEDS, OT_RS_CL, defaultCollateral, true),
            ExtDef(bytes32("USDC"), USDC, USDC_FEEDS, OT_RS_CL, defaultCollateral, true),
            ExtDef(bytes32("ETH"), WETH, ETH_FEEDS, OT_RS_CL, defaultCollateral, false),
            ExtDef(bytes32("BTC"), WBTC, BTC_FEEDS, OT_RS_CL, defaultCollateral, false)
        ];
    }

    function getKrAssets() internal view override returns (KrAssetDef[KR_ASSET_COUNT] memory) {
        return [
            KrAssetDef("Kresko: Ether", "krETH", address(WETH), bytes32("ETH"), ETH_FEEDS, OT_RS_CL, defaultKrAsset, true),
            KrAssetDef("Kresko: Bitcoin", "krBTC", address(WBTC), bytes32("BTC"), BTC_FEEDS, OT_RS_CL, defaultKrAsset, true),
            KrAssetDef("Kresko: Yen", "krJPY", addr.ZERO, bytes32("JPY"), JPY_FEEDS, OT_RS_CL, defaultKrAsset, true),
            KrAssetDef("Kresko: Euro", "krEUR", addr.ZERO, bytes32("EUR"), EUR_FEEDS, OT_RS_CL, defaultKrAsset, true)
        ];
    }

    function getVaultAssets() internal view override returns (VaultAsset[VAULT_ASSET_COUNT] memory) {
        return [
            VaultAsset({
                token: USDC,
                feed: cl.USDC,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            }),
            VaultAsset({
                token: USDT,
                feed: cl.USDT,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            }),
            VaultAsset({
                token: DAI,
                feed: cl.DAI,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        ];
    }

    /* -------------------------------- KrAssets -------------------------------- */
    KrDeployExtended[KR_ASSET_COUNT] internal DEPLOYED_KR_ASSETS;
    /* ----------------------------- On-chain Feeds ----------------------------- */
    address[2] internal ETH_FEEDS = [addr.ZERO, addr.CL_ETH];
    address[2] internal BTC_FEEDS = [addr.ZERO, addr.CL_BTC];
    address[2] internal DAI_FEEDS = [addr.ZERO, addr.CL_DAI];
    address[2] internal EUR_FEEDS = [addr.ZERO, addr.CL_EUR];
    address[2] internal USDC_FEEDS = [addr.ZERO, addr.CL_USDC];
    address[2] internal USDT_FEEDS = [addr.ZERO, addr.CL_USDT];
    address[2] internal JPY_FEEDS = [addr.ZERO, addr.CL_JPY];

    /* -------------------------------- Functions ------------------------------- */
    function getCoreConfig() internal returns (DeployArgs memory) {
        admin_ = getAddr(0);
        address treasury = getAddr(10);

        deployArgs = DeployArgs({
            admin: admin_,
            seqFeed: addr.CL_SEQ_UPTIME,
            staleTime: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            council: getMockSafe(admin_),
            treasury: treasury
        });
        return deployArgs;
    }

    function createCore(DeployArgs memory coreArgs) public returns (address kresko_) {
        require(coreArgs.admin != addr.ZERO, "createCore: coreArgs should have some admin address set");
        kresko = deployDiamondOneTx(coreArgs);
        proxyFactory = deployProxyFactory(coreArgs.admin);
        return address(kresko);
    }

    function createVault(address _kresko) internal returns (address vault_) {
        require(_kresko != addr.ZERO, "createCore should be called before createVault");
        vkiss = new Vault("vKISS", "vKISS", 18, 8, deployArgs.treasury, address(deployArgs.seqFeed));
        return address(vkiss);
    }

    function createKISS(address _vault, address _kresko) internal returns (address kiss_) {
        kiss = new KISS();
        kiss.initialize("Kresko: KISS", "KISS", 18, deployArgs.council, _kresko, _vault);
    }

    function createKrAssets(DeployArgs memory coreArgs) internal returns (KrDeploy[KR_ASSET_COUNT] memory krAssets_) {
        require(address(kiss) != addr.ZERO, "createKISS should be called before createKrAssets");
        unchecked {
            for (uint256 i; i < KR_ASSET_COUNT; i++) {
                krAssets_[i] = deployKrAsset(
                    KR_ASSETS[i].name,
                    KR_ASSETS[i].symbol,
                    KR_ASSETS[i].underlying,
                    coreArgs.admin,
                    coreArgs.treasury
                );
            }
        }
    }

    function configureAssets(KrDeploy[KR_ASSET_COUNT] memory krAssets) internal {
        require(krAssets[0].addr != addr.ZERO, "createKrAssets should be called before configureAssets");
        /* --------------------- Whitelist external collaterals --------------------- */
        addCollateral(bytes32("ETH"), addr.WETH, true, ORACLES_RS_CL, ETH_FEEDS, defaultCollateral);
        addCollateral(bytes32("BTC"), addr.WBTC, true, ORACLES_RS_CL, BTC_FEEDS, defaultCollateral);
        addCollateral(bytes32("DAI"), addr.DAI, true, ORACLES_RS_CL, DAI_FEEDS, defaultCollateral);
        addCollateral(bytes32("USDC"), addr.USDC, true, ORACLES_RS_CL, USDC_FEEDS, defaultCollateral);
        addCollateral(bytes32("USDT"), addr.USDT, true, ORACLES_RS_CL, USDT_FEEDS, defaultCollateral);
        /* ----------------------------- Whitelist KISS ----------------------------- */
        kissConfig = addKISS(address(kiss), address(vkiss), defaultKISS);
        /* ----------------------- Deploy + whitelist KrAssets ---------------------- */
        krETH = addKrAsset(
            bytes32("ETH"),
            false,
            ORACLES_RS_CL,
            ETH_FEEDS,
            deployKrAsset("Kresko: Ether", "krETH", addr.WETH, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        krBTC = addKrAsset(
            bytes32("BTC"),
            false,
            ORACLES_RS_CL,
            BTC_FEEDS,
            deployKrAsset("Kresko: Bitcoin", "krBTC", addr.WBTC, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        krEUR = addKrAsset(
            bytes32("EUR"),
            false,
            ORACLES_RS_CL,
            BTC_FEEDS,
            deployKrAsset("Kresko: Euro", "krEUR", addr.WBTC, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        krJPY = addKrAsset(
            bytes32("JPY"),
            true,
            ORACLES_RS_CL,
            JPY_FEEDS,
            deployKrAsset("Kresko: Yen", "krJPY", addr.ZERO, deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );

        /* -------------------------------------------------------------------------- */
        /*                               CONFIGURATIONS                               */
        /* -------------------------------------------------------------------------- */

        enableSwapBothWays(address(kiss), krETH.addr, true);
        enableSwapBothWays(address(kiss), krJPY.addr, true);
        enableSwapSingleWay(krJPY.addr, krETH.addr, true);
        kresko.setFeeAssetSCDP(address(kiss));
    }

    function configureVault() internal {
        require(address(vkiss) != addr.ZERO, "setup vault+diamond before these vault assets");
        unchecked {
            for (uint256 i; i < VAULT_ASSET_COUNT; i++) {
                vkiss.addAsset(VAULT_ASSETS[i]);
            }
        }
    }

    function configureSwaps() internal {
        SwapRouteSetter[] memory routing = new SwapRouteSetter[](9);
        routing[0] = SwapRouteSetter({assetIn: address(kiss), assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: address(kiss), assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: address(kiss), assetOut: krEUR.addr, enabled: true});

        routing[3] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krJPY.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krEUR.addr, enabled: true});

        routing[6] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krEUR.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krJPY.addr, enabled: true});

        routing[8] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krJPY.addr, enabled: true});
        kresko.setSwapRoutesSCDP(routing);

        // for full coverage, only JPY -> KISS and not KISS -> JPY
        kresko.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: address(kiss), enabled: true})); //
    }

    constructor(string memory _mnemonicId) DevnetSetupBase(_mnemonicId) {}
}

/**
 * @dev Base for fresh local network:
 * @dev Call deployCore() to create all the core contracts
 * Configuration:
 * # External addresses (tokens + oracle feeds)
 * # Redstone mocked prices
 * # Kresko Assets to deploy
 * # Vault Asset configuration
 */
abstract contract LocalSetup is DevnetSetupBase {
    MockCollDeploy internal dai;
    MockCollDeploy internal usdt;
    MockCollDeploy internal usdc;
    MockCollDeploy internal wbtc;

    KrDeployExtended internal krETH;
    KrDeployExtended internal krBTC;
    KrDeployExtended internal krJPY;

    string constant btcPrice = "BTC:27662:8";
    string constant ethPrice = "ETH:1590:8";
    string constant daiPrice = "DAI:1:8";
    string constant usdcPrice = "USDC:1:8";
    string constant usdtPrice = "USDT:1:8";
    string constant eurPrice = "EUR:1.06:8";
    string constant jpyPrice = "JPY:0.0067:8";
    string constant initialPrices =
        btcPrice.and(ethPrice).and(daiPrice).and(usdcPrice).and(usdtPrice).and(eurPrice).and(jpyPrice);

    function getCoreConfig() public returns (address admin_) {
        admin_ = getAddr(0);
        deployArgs = DeployArgs({
            admin: admin_,
            seqFeed: getMockSeqFeed(),
            minterMcr: 150e2,
            minterLt: 140e2,
            scdpMcr: 200e2,
            scdpLt: 150e2,
            staleTime: 86401,
            council: getMockSafe(admin_),
            sdiPrecision: 8,
            oraclePrecision: 8,
            treasury: TEST_TREASURY
        });
        kresko = deployDiamondOneTx(deployArgs);
        proxyFactory = deployProxyFactory(deployArgs.admin);
    }

    function setupSpecialTokens() internal {
        require(address(kresko) != addr.ZERO, "deploy the diamond before special tokens");
        require(deployArgs.admin != addr.ZERO, "some admin address should be set");
        require(deployArgs.seqFeed != addr.ZERO, "deploy the sequencer uptime feed before special tokens");
        require(deployArgs.treasury != addr.ZERO, "some treasury address is required");

        weth9 = new WETH9();
        vkiss = new Vault("vKISS", "vKISS", 18, 8, deployArgs.treasury, address(deployArgs.seqFeed));
        kiss = new KISS();
        kiss.initialize(
            "Kresko Integrated Stable System",
            "KISS",
            18,
            address(deployArgs.council),
            address(kresko),
            address(vkiss)
        );
    }

    function setupVault() internal {
        require(dai.addr != address(0), "dai");
        require(usdc.addr != address(0), "usdc");
        require(usdt.addr != address(0), "usdt");
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(usdc.addr),
                feed: usdc.oracle,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(usdt.addr),
                feed: usdt.oracle,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
        vkiss.addAsset(
            VaultAsset({
                token: ERC20(dai.addr),
                feed: dai.oracle,
                staleTime: 86401,
                decimals: 0,
                depositFee: 0,
                withdrawFee: 0,
                maxDeposits: type(uint248).max,
                enabled: true
            })
        );
    }

    function setupProtocol() internal {
        kissConfig = addKISS(address(kiss), address(vkiss), defaultKISS);

        dai = mockCollateral(
            bytes32("DAI"),
            MockConfig({symbol: "DAI", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultCollateral
        );

        usdc = mockCollateral(
            bytes32("USDC"),
            MockConfig({symbol: "USDC", price: 1e8, setFeeds: true, tknDecimals: 18, oracleDecimals: 8}),
            defaultCollateral
        );

        usdt = mockCollateral(
            bytes32("USDT"),
            MockConfig({symbol: "USDT", price: 1e8, setFeeds: true, tknDecimals: 6, oracleDecimals: 8}),
            defaultCollateral
        );

        weth9 = new WETH9();
        MockOracle ethOracle = new MockOracle("ETH", 2000e8, 8);
        addCollateral(bytes32("ETH"), address(weth9), true, ORACLES_RS_CL, [addr.ZERO, address(ethOracle)], defaultCollateral);

        krETH = addKrAsset(
            bytes32("ETH"),
            false,
            ORACLES_RS_CL,
            [addr.ZERO, address(ethOracle)],
            deployKrAsset("krETH", "krETH", address(weth9), deployArgs.admin, deployArgs.treasury),
            defaultKrAsset
        );
        KrDeployExtended memory krBTCDeploy = deployKrAssetWithOracle("krBTC", "krBTC", 20000e8, addr.ZERO, deployArgs);
        krBTC = addKrAsset(
            bytes32("BTC"),
            true,
            ORACLES_RS_CL,
            [addr.ZERO, krBTCDeploy.oracleAddr],
            krBTCDeploy,
            defaultKrAsset
        );

        KrDeployExtended memory krJPYDeploy = deployKrAssetWithOracle("krJPY", "krJPY", 1e8, addr.ZERO, deployArgs);
        krJPY = addKrAsset(
            bytes32("JPY"),
            true,
            ORACLES_RS_CL,
            [addr.ZERO, krJPYDeploy.oracleAddr],
            krJPYDeploy,
            defaultKrAsset
        );

        krETH.krAsset.setUnderlying(address(weth9));

        enableSwapBothWays(address(kiss), krETH.addr, true);
        enableSwapBothWays(address(kiss), krJPY.addr, true);
        enableSwapSingleWay(krJPY.addr, krETH.addr, true);
        kresko.setFeeAssetSCDP(address(kiss));
    }

    constructor(string memory _mnemonicId) DevnetSetupBase(_mnemonicId) {}
}
