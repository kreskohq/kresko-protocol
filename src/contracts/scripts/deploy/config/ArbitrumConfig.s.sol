// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {Help} from "kresko-lib/utils/Libs.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {Addr, Tokens, ChainLink} from "kresko-lib/info/Arbitrum.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {DeployLogicBase} from "scripts/deploy/base/DeployLogic.s.sol";
import {state} from "scripts/deploy/base/IDeployState.sol";
import {DataV1} from "periphery/DataV1.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";
import {KISS} from "kiss/KISS.sol";
import {IKresko} from "periphery/IKresko.sol";

interface INFT {
    function mint(address to, uint256 tokenId, uint256 amount) external;

    function grantRole(bytes32 role, address to) external;

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;
}

abstract contract ArbitrumDeployConfig is ScriptBase, DeployLogicBase {
    using Help for *;

    constructor(string memory _mnemonicId) ScriptBase(_mnemonicId) {}

    uint256 internal constant USER_COUNT = 6;
    uint32[USER_COUNT] testUsers = [0, 1, 2, 3, 4, 5];

    uint256 constant EXT_COUNT = 6;
    uint256 constant KR_COUNT = 6;
    uint256 constant VAULT_COUNT = 2;
    /* --------------------------------- assets --------------------------------- */
    IWETH9 internal WETH = IWETH9(Addr.WETH);
    IERC20 internal WBTC = IERC20(Addr.WBTC);
    IERC20 internal DAI = IERC20(Addr.DAI);
    IERC20 internal USDC = IERC20(Addr.USDC);
    IERC20 internal USDCe = IERC20(Addr.USDCe);
    IERC20 internal USDT = IERC20(Addr.USDT);
    /* ------------------------------------ . ----------------------------------- */

    KrAssetInfo internal krETH;
    KrAssetInfo internal krBTC;
    KrAssetInfo internal krJPY;
    KrAssetInfo internal krEUR;
    KrAssetInfo internal krWTI;
    KrAssetInfo internal krXAU;

    /* ------------------------------------ . ----------------------------------- */
    address[2] internal feeds_eth = [address(0), Addr.CL_ETH];
    address[2] internal feeds_btc = [address(0), Addr.CL_BTC];
    address[2] internal feeds_eur = [address(0), Addr.CL_EUR];
    address[2] internal feeds_dai = [address(0), Addr.CL_DAI];
    address[2] internal feeds_usdt = [address(0), Addr.CL_USDT];
    address[2] internal feeds_usdc = [address(0), Addr.CL_USDC];
    address[2] internal feeds_jpy = [address(0), Addr.CL_JPY];
    address[2] internal feeds_wti = [address(0), Addr.CL_WTI];
    address[2] internal feeds_xau = [address(0), Addr.CL_XAU];
    /* ------------------------------------ . ----------------------------------- */
    uint256 price_eth = 2075e8;
    uint256 price_btc = 35159.01e8;
    uint256 price_dai = 0.9998e8;
    uint256 price_eur = 1.07e8;
    uint256 price_usdc = 1e8;
    uint256 price_usdt = 1.0006e8;
    uint256 price_jpy = 0.0067e8;
    uint256 price_xau = 1977.68e8;
    uint256 price_wti = 77.5e8;
    /* ------------------------------------ . ----------------------------------- */
    // @todo can probably delete these aswell
    string price_eth_rs = "ETH:2075:8";
    string price_btc_rs = "BTC:37559.01:8";
    string price_eur_rs = "EUR:1.07:8";
    string price_dai_rs = "DAI:0.9998:8";
    string price_usdc_rs = "USDC:1:8";
    string price_xau_rs = "XAU:1980.68:8";
    string price_wti_rs = "WTI:77.5:8";
    string price_usdt_rs = "USDT:1:8";
    string price_jpy_rs = "JPY:0.0067:8";

    string constant initialPrices =
        "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8;XAU:1980.68:8;WTI:77.5:8";

    function createPriceString() internal view returns (string memory) {
        return
            price_eth_rs
                .and(",")
                .and(price_btc_rs)
                .and(",")
                .and(price_eur_rs)
                .and(",")
                .and(price_dai_rs)
                .and(",")
                .and(price_usdc_rs)
                .and(",")
                .and(price_usdt_rs)
                .and(",")
                .and(price_jpy_rs);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Handlers                                  */
    /* -------------------------------------------------------------------------- */

    /// @notice ETH, BTC, DAI, USDC, USDT
    function EXT_ASSET_CONFIG() internal view returns (ExtAssetCfg[] memory ext_) {
        ext_ = new ExtAssetCfg[](EXT_COUNT);
        ext_[0] = ExtAssetCfg(bytes32("ETH"), WETH.symbol(), WETH, 1e4, 1.05e4, feeds_eth, OT_RS_CL, ext_default, false);
        ext_[1] = ExtAssetCfg(bytes32("BTC"), WBTC.symbol(), WBTC, 1e4, 1.05e4, feeds_btc, OT_RS_CL, ext_default, false);
        ext_[2] = ExtAssetCfg(bytes32("DAI"), DAI.symbol(), DAI, 1e4, 1.05e4, feeds_dai, OT_RS_CL, ext_default, true);
        ext_[3] = ExtAssetCfg(bytes32("USDC"), USDC.symbol(), USDC, 1e4, 1.05e4, feeds_usdc, OT_RS_CL, ext_default, true);
        ext_[4] = ExtAssetCfg(bytes32("USDT"), USDT.symbol(), USDT, 1e4, 1.05e4, feeds_usdt, OT_RS_CL, ext_default, true);
        ext_[5] = ExtAssetCfg(bytes32("USDC"), "USDC.e", USDCe, 1e4, 1.05e4, feeds_usdc, OT_RS_CL, ext_default, false);
    }

    /// @notice ETH, BTC, EUR, JPY
    function KR_ASSET_CONFIG() internal view returns (KrAssetCfg[] memory kra_) {
        kra_ = new KrAssetCfg[](KR_COUNT);
        kra_[0] = KrAssetCfg({
            name: "Kresko: Ether",
            symbol: "krETH",
            ticker: bytes32("ETH"),
            underlying: Addr.WETH,
            feeds: feeds_eth,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            kFactor: 1.05e4,
            factor: 1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 15,
            swapOutFeeSCDP: 10,
            protocolFeeShareSCDP: 0.2e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[1] = KrAssetCfg({
            name: "Kresko: Bitcoin",
            symbol: "krBTC",
            ticker: bytes32("BTC"),
            underlying: Addr.WBTC,
            feeds: feeds_btc,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            kFactor: 1.05e4,
            factor: 1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 15,
            swapOutFeeSCDP: 10,
            protocolFeeShareSCDP: 0.2e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[2] = KrAssetCfg({
            name: "Kresko: Euro",
            symbol: "krEUR",
            ticker: bytes32("EUR"),
            underlying: address(0),
            feeds: feeds_eur,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            kFactor: 1.01e4,
            factor: 1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 15,
            swapOutFeeSCDP: 10,
            protocolFeeShareSCDP: 0.25e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[3] = KrAssetCfg({
            name: "Kresko: Yen",
            symbol: "krJPY",
            ticker: bytes32("JPY"),
            underlying: address(0),
            feeds: feeds_jpy,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            kFactor: 1.01e4,
            factor: 1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 20,
            swapOutFeeSCDP: 25,
            protocolFeeShareSCDP: 0.25e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[4] = KrAssetCfg({
            name: "Kresko: Gold",
            symbol: "krXAU",
            ticker: bytes32("XAU"),
            underlying: address(0),
            feeds: feeds_xau,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            kFactor: 1.025e4,
            factor: 1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 20,
            protocolFeeShareSCDP: 0.25e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[5] = KrAssetCfg({
            name: "Kresko: Crude Oil",
            symbol: "krWTI",
            ticker: bytes32("WTI"),
            underlying: address(0),
            feeds: feeds_wti,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            kFactor: 1.025e4,
            factor: 1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 20,
            protocolFeeShareSCDP: 0.25e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
    }

    /// @notice DAI, USDC, USDT
    function VAULT_ASSET_CONFIG() internal view returns (VaultAsset[] memory vault_) {
        vault_ = new VaultAsset[](VAULT_COUNT);
        vault_[0] = VaultAsset({
            token: USDC,
            feed: ChainLink.USDC,
            staleTime: 86401,
            decimals: 0,
            depositFee: 2,
            withdrawFee: 3,
            maxDeposits: type(uint248).max,
            enabled: true
        });
        vault_[1] = VaultAsset({
            token: USDCe,
            feed: ChainLink.USDC,
            staleTime: 86401,
            decimals: 0,
            depositFee: 2,
            withdrawFee: 3,
            maxDeposits: type(uint248).max,
            enabled: true
        });
    }

    // @todo Remove explicit state for assets (and this helper step that sets them).
    function addAssets(
        AssetCfg memory _assetCfg,
        KrAssetDeployInfo[] memory _kraContracts,
        KISSInfo memory _kiss,
        address _kreskoAddr
    ) internal virtual override returns (AssetsOnChain memory results_) {
        results_ = super.addAssets(_assetCfg, _kraContracts, _kiss, _kreskoAddr);

        krETH = results_.kra[0];
        krBTC = results_.kra[1];
        krEUR = results_.kra[2];
        krJPY = results_.kra[3];
        krXAU = results_.kra[4];
        krWTI = results_.kra[5];
    }

    /* ---------------------------------- users --------------------------------- */
    function createUserConfig(uint32[USER_COUNT] memory _idxs) internal returns (UserCfg[] memory userCfg_) {
        userCfg_ = new UserCfg[](USER_COUNT);

        uint256[EXT_COUNT][] memory bals = new uint256[EXT_COUNT][](USER_COUNT);

        bals[0] = [uint256(100 ether), 10e8, 10000e18, 10000e6, 10000e6, 15000e6]; // deployer
        bals[1] = [uint256(0), 0, 0, 0, 0, 0]; // nothing
        bals[2] = [uint256(100 ether), 10e8, 1e24, 1e12, 1e12, 2e12]; // a lot
        bals[3] = [uint256(0.05 ether), 0.01e8, 50e18, 10e6, 5e6, 45e6]; // low
        bals[4] = [uint256(2 ether), 0.05e8, 3000e18, 1000e6, 800e6, 750e6];
        bals[5] = [uint256(2 ether), 0.05e8, 3000e18, 1000e6, 800e6, 750e6];

        return createUserConfig(_idxs.dyn(), bals);
    }

    function createUserConfig(
        uint32[] memory _idxs,
        uint256[EXT_COUNT][] memory _bals
    ) internal returns (UserCfg[] memory userCfg_) {
        require(_idxs.length == _bals.length, "createUserConfig: idxs and bals length mismatch");
        userCfg_ = new UserCfg[](_idxs.length);
        unchecked {
            for (uint256 i; i < _idxs.length; i++) {
                address userAddr = getAddr(_idxs[i]);
                vm.deal(userAddr, _bals[i][0] + 100 ether);
                userCfg_[i] = UserCfg(userAddr, _bals[i].dyn());
            }
        }

        super.afterUserConfig(userCfg_);
    }

    function configureSwap(address, AssetsOnChain memory) internal virtual override {
        super.afterDeployment();
    }

    function setupUsers(UserCfg[] memory _usersCfg, AssetsOnChain memory _assetsOnChain) internal virtual;
}

/**
 * @dev Arbitrum deployment using defaults
 * @dev Implements the functions that are called by launch scripts
 */
abstract contract ArbitrumDeployment is ArbitrumDeployConfig {
    constructor(string memory _mnemonicId) ArbitrumDeployConfig(_mnemonicId) {}

    function createAssetConfig() internal override returns (AssetCfg memory assetCfg_) {
        WETH = Tokens.WETH;
        assetCfg_.wethIndex = 0;

        assetCfg_.ext = EXT_ASSET_CONFIG();
        assetCfg_.kra = KR_ASSET_CONFIG();
        assetCfg_.vassets = VAULT_ASSET_CONFIG();

        string[] memory vAssetSymbols = new string[](VAULT_COUNT);
        vAssetSymbols[0] = Tokens.USDC.symbol();
        vAssetSymbols[1] = "USDC.e";
        assetCfg_.vaultSymbols = vAssetSymbols;

        super.afterAssetConfigs(assetCfg_);
    }

    function createCoreConfig(
        address _admin,
        address _treasury,
        address _gatingManager
    ) internal override returns (CoreConfig memory cfg_) {
        cfg_ = CoreConfig({
            admin: _admin,
            seqFeed: Addr.CL_SEQ_UPTIME,
            gatingManager: _gatingManager,
            staleTime: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            coverThreshold: 160e2,
            coverIncentive: 1.01e4,
            scdpMcr: 250e2,
            scdpLt: 150e2,
            sdiPrecision: 8,
            oraclePrecision: 8,
            council: getMockSafe(_admin),
            treasury: _treasury
        });

        deployCfg = cfg_;

        super.afterCoreConfig(cfg_);
    }

    function configureSwap(address _kreskoAddr, AssetsOnChain memory _assetsOnChain) internal override {
        ISCDPConfigFacet facet = ISCDPConfigFacet(_kreskoAddr);
        address kissAddr = _assetsOnChain.kiss.addr;

        facet.setFeeAssetSCDP(kissAddr);

        // @todo Use assets only from _assetsOnChain
        SwapRouteSetter[] memory routing = new SwapRouteSetter[](20);
        routing[0] = SwapRouteSetter({assetIn: kissAddr, assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: kissAddr, assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: kissAddr, assetOut: krEUR.addr, enabled: true});
        routing[3] = SwapRouteSetter({assetIn: kissAddr, assetOut: krXAU.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: kissAddr, assetOut: krWTI.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: kissAddr, assetOut: krJPY.addr, enabled: true});

        routing[6] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krJPY.addr, enabled: true});
        routing[8] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krEUR.addr, enabled: true});
        routing[9] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krXAU.addr, enabled: true});
        routing[10] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krWTI.addr, enabled: true});

        routing[11] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krEUR.addr, enabled: true});
        routing[12] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krJPY.addr, enabled: true});
        routing[13] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krXAU.addr, enabled: true});
        routing[14] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krWTI.addr, enabled: true});

        routing[15] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krJPY.addr, enabled: true});
        routing[16] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krWTI.addr, enabled: true});
        routing[17] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krXAU.addr, enabled: true});

        routing[18] = SwapRouteSetter({assetIn: krXAU.addr, assetOut: krWTI.addr, enabled: true});
        routing[19] = SwapRouteSetter({assetIn: krXAU.addr, assetOut: krJPY.addr, enabled: true});

        facet.setSwapRoutesSCDP(routing);
        facet.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: krWTI.addr, enabled: true})); //
        super.configureSwap(_kreskoAddr, _assetsOnChain);
    }

    function deployPeriphery() internal {
        state().dataProvider = new DataV1(
            IDataFacet(state().kresko),
            address(state().vault),
            address(state().kiss),
            0xAbDb949a18d27367118573A217E5353EDe5A0f1E,
            0x1C04925779805f2dF7BbD0433ABE92Ea74829bF6
        );
        state().multicall = new KrMulticall(address(state().kresko), address(state().kiss), address(Addr.V3_Router02));
        state().kresko.grantRole(Role.MANAGER, address(state().multicall));
    }

    function setupUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _results) internal override {}

    /* ---------------------------------------------------------------------- */
    /*                           Impersonation Setup                          */
    /* ---------------------------------------------------------------------- */

    function createUsers() external {
        kresko = IKresko(getDeployed(".Kresko"));
        __current_kresko = address(kresko);
        kiss = KISS(getDeployed(".KISS"));

        address krETHAddr = getDeployed(".krETH");
        address krJPYAddr = getDeployed(".krJPY");

        for (uint256 i; i < testUsers.length; i++) {
            uint256 usdcDepositAmount = i == 1 ? 500e6 : 50000e6;

            uint256 wethDepositAmount = i == 1 ? 0.05 ether : 10 ether;
            uint256 wethCollateralAMount = i == 1 ? 0.02 ether : 5 ether;

            uint256 usdcKissDepositAmount = i == 1 ? 100e6 : 10000e6;
            uint256 krJpyMintAmount = i == 1 ? 5000 ether : 1000000 ether;
            uint256 krEthMintAmount = i == 1 ? 0.01 ether : 5 ether;

            address user = getAddr(testUsers[i]);
            broadcastWith(user);
            Tokens.USDC.approve(address(kresko), type(uint256).max);
            Tokens.WETH.approve(address(kresko), type(uint256).max);
            Tokens.USDC.approve(address(kiss), type(uint256).max);

            kiss.vaultDeposit(Addr.USDC, usdcKissDepositAmount, user);

            kresko.depositCollateral(user, Addr.USDC, usdcDepositAmount);

            Tokens.WETH.deposit{value: wethDepositAmount}();
            kresko.depositCollateral(user, Addr.WETH, wethCollateralAMount);

            call(kresko.mintKreskoAsset.selector, user, krETHAddr, krEthMintAmount, user, initialPrices);
            call(kresko.mintKreskoAsset.selector, user, krJPYAddr, krJpyMintAmount, user, initialPrices);
            vm.stopBroadcast();
        }

        broadcastWith(getAddr(0));
        (uint256 sharesOut, ) = kiss.vaultDeposit(Addr.USDC, 50000e6, getAddr(0));
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(getAddr(0), address(kiss), sharesOut);
        IGatingManager(getDeployed(".GatingManager")).setPhase(1);
        vm.stopBroadcast();
    }

    function setupWBTC() external {
        vm.startBroadcast(0x4bb7f4c3d47C4b431cb0658F44287d52006fb506);
        for (uint256 i; i < testUsers.length; i++) {
            address user = getAddr(testUsers[i]);
            MockERC20(Addr.WBTC).transfer(user, 0.253333e8);
        }
        vm.stopBroadcast();
        Log.clg("WBTC sent to users");
    }

    function setupNFTs() external {
        address nftOwner = 0x99999A0B66AF30f6FEf832938a5038644a72180a;
        vm.startBroadcast(nftOwner);
        INFT kreskian = INFT(Addr.OFFICIALLY_KRESKIAN);
        INFT questForKresko = INFT(Addr.QUEST_FOR_KRESK);

        kreskian.safeTransferFrom(nftOwner, getAddr(0), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 1, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 2, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 3, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(0), 4, 1, "");

        kreskian.safeTransferFrom(nftOwner, getAddr(1), 0, 1, "");
        questForKresko.safeTransferFrom(nftOwner, getAddr(1), 0, 1, "");

        kreskian.safeTransferFrom(nftOwner, getAddr(2), 0, 1, "");
        vm.stopBroadcast();
    }

    function setupStables() external {
        vm.startBroadcast(0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D);
        for (uint256 i; i < testUsers.length; i++) {
            address user = getAddr(testUsers[i]);
            if (i == 0) {
                MockERC20(Addr.USDC).transfer(user, 200000e6);
            } else {
                MockERC20(Addr.USDC).transfer(user, 110000e6);
            }
            MockERC20(Addr.USDCe).transfer(user, 17500e6);
            MockERC20(Addr.DAI).transfer(user, 25000 ether);
            MockERC20(Addr.USDT).transfer(user, 5000e6);
        }
        vm.stopBroadcast();
        Log.clg("USDCe sent to users");
    }

    function writeDeploymentJSON() internal override {
        string memory obj = "deployment";
        vm.serializeString(obj, "EMPTY", "0xEMPTY");
        vm.serializeAddress(obj, "KISS", address(state().kiss));
        vm.serializeAddress(obj, "USDC", address(USDC));
        vm.serializeAddress(obj, "USDC.e", address(USDCe));
        vm.serializeAddress(obj, "ETH", 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        vm.serializeAddress(obj, "WETH", address(WETH));
        vm.serializeAddress(obj, "WBTC", address(WBTC));
        vm.serializeAddress(obj, "USDT", address(USDT));
        vm.serializeAddress(obj, "DAI", address(DAI));
        vm.serializeAddress(obj, "krETH", krETH.addr);
        vm.serializeAddress(obj, "krBTC", krBTC.addr);
        vm.serializeAddress(obj, "krEUR", krEUR.addr);
        vm.serializeAddress(obj, "krJPY", krJPY.addr);
        vm.serializeAddress(obj, "krWTI", krWTI.addr);
        vm.serializeAddress(obj, "krXAU", krXAU.addr);
        vm.serializeAddress(obj, "Vault", address(state().vault));
        vm.serializeAddress(obj, "UniswapRouter", Addr.V3_Router02);
        vm.serializeAddress(obj, "DataV1", address(state().dataProvider));
        vm.serializeAddress(obj, "Kresko", address(state().kresko));
        vm.serializeAddress(obj, "Multicall", address(state().multicall));
        vm.serializeAddress(obj, "GatingManager", address(state().gatingManager));
        string memory output = vm.serializeAddress(obj, "Factory", address(state().factory));
        vm.writeJson(output, "./out/arbitrum.json");
        Log.clg("Deployment JSON written to: ./out/arbitrum.json");
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum.json"));
        return vm.parseJsonAddress(json, key);
    }
}
