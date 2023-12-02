// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {Help} from "kresko-lib/utils/Libs.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {ArbSepolia} from "kresko-lib/info/testnet/ArbitrumSepolia.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {DeployLogicBase} from "scripts/deploy/base/DeployLogic.s.sol";
import {state} from "scripts/deploy/base/IDeployState.sol";
import {DataV1} from "periphery/DataV1.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {Log} from "kresko-lib/utils/Libs.sol";

interface INFT {
    function mint(address to, uint256 tokenId, uint256 amount) external;

    function grantRole(bytes32 role, address to) external;
}

abstract contract ArbitrumSepoliaDeployConfig is ScriptBase, DeployLogicBase {
    using Help for *;

    constructor(string memory _mnemonicId) ScriptBase(_mnemonicId) {}

    uint256 internal constant USER_COUNT = 6;
    uint32[USER_COUNT] testUsers = [0, 1, 2, 3, 4, 5];
    uint256 constant EXT_COUNT = 5;
    uint256 constant KR_COUNT = 4;
    uint256 constant VAULT_COUNT = 2;
    /* --------------------------------- assets --------------------------------- */
    IWETH9 WETH = IWETH9(ArbSepolia.WETH);
    IERC20 WBTC = IERC20(ArbSepolia.WBTC);
    IERC20 DAI = IERC20(ArbSepolia.DAI);
    IERC20 USDC = IERC20(ArbSepolia.USDC);
    IERC20 USDCe = IERC20(ArbSepolia.USDCe);
    /* ------------------------------------ . ----------------------------------- */
    KrAssetInfo krETH;
    KrAssetInfo krBTC;
    KrAssetInfo krSPY;
    KrAssetInfo krARB;
    /* ------------------------------------ . ----------------------------------- */
    address[2] feeds_eth = [address(0), ArbSepolia.CL_ETH];
    address[2] feeds_btc = [address(0), ArbSepolia.CL_BTC];
    address[2] feeds_dai = [address(0), ArbSepolia.CL_DAI];
    address[2] feeds_spy = [address(0), ArbSepolia.CL_SPY];
    address[2] feeds_arb = [address(0), ArbSepolia.CL_ARB];
    address[2] feeds_usdc = [address(0), ArbSepolia.CL_USDC];
    /* ------------------------------------ . ----------------------------------- */
    string price_eth_rs = "ETH:2045:8";
    string price_btc_rs = "BTC:37759.01:8";
    string price_dai_rs = "DAI:0.9998:8";
    string price_usdc_rs = "USDC:1:8";
    string price_spy_rs = "SPY:4567.8:8";
    string price_arb_rs = "ARB:1.01:8";

    string constant initialPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,SPY:4567.8:8,ARB:1.01:8";

    function createPriceString() internal view returns (string memory) {
        return
            price_eth_rs
                .and(",")
                .and(price_btc_rs)
                .and(",")
                .and(price_dai_rs)
                .and(",")
                .and(price_usdc_rs)
                .and(",")
                .and(price_spy_rs)
                .and(",")
                .and(price_arb_rs);
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
        ext_[4] = ExtAssetCfg(bytes32("USDC"), "USDC.e", USDCe, 1e4, 1.05e4, feeds_usdc, OT_RS_CL, ext_default, false);
    }

    /// @notice ETH, BTC, EUR, JPY
    function KR_ASSET_CONFIG() internal view returns (KrAssetCfg[] memory kra_) {
        kra_ = new KrAssetCfg[](KR_COUNT);
        kra_[0] = KrAssetCfg({
            name: "Kresko: Ether",
            symbol: "krETH",
            ticker: bytes32("ETH"),
            underlying: address(WETH),
            feeds: feeds_eth,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            factor: 1e4,
            kFactor: 1.05e4,
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
            underlying: address(WBTC),
            feeds: feeds_btc,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            factor: 1e4,
            kFactor: 1.05e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 20,
            swapOutFeeSCDP: 15,
            protocolFeeShareSCDP: 0.2e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[2] = KrAssetCfg({
            name: "Kresko: SPY",
            symbol: "krSPY",
            ticker: bytes32("SPY"),
            underlying: address(0),
            feeds: feeds_spy,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            factor: 1e4,
            kFactor: 1.035e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 25,
            protocolFeeShareSCDP: 0.25e4,
            maxDebtMinter: type(uint128).max,
            maxDebtSCDP: type(uint128).max
        });
        kra_[3] = KrAssetCfg({
            name: "Kresko: Arbitrum",
            symbol: "krARB",
            ticker: bytes32("ARB"),
            underlying: address(0),
            feeds: feeds_arb,
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            factor: 1e4,
            kFactor: 1.1e4,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 15,
            swapOutFeeSCDP: 10,
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
            feed: IAggregatorV3(ArbSepolia.CL_USDC),
            staleTime: 86401,
            decimals: 0,
            depositFee: 2,
            withdrawFee: 3,
            maxDeposits: type(uint248).max,
            enabled: true
        });
        vault_[1] = VaultAsset({
            token: USDCe,
            feed: IAggregatorV3(ArbSepolia.CL_USDC),
            staleTime: 86401,
            decimals: 0,
            depositFee: 3,
            withdrawFee: 2,
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
        krSPY = results_.kra[2];
        krARB = results_.kra[3];
    }

    /* ---------------------------------- users --------------------------------- */

    function createUserConfig(uint32[USER_COUNT] memory _idxs) internal returns (UserCfg[] memory userCfg_) {
        userCfg_ = new UserCfg[](USER_COUNT);

        uint256[EXT_COUNT][] memory bals = new uint256[EXT_COUNT][](USER_COUNT);

        bals[0] = [uint256(100 ether), 10e8, 10000e18, 10000e6, 10000e6]; // deployer
        bals[1] = [uint256(0), 0, 0, 0, 0]; // nothing
        bals[2] = [uint256(100 ether), 10e8, 1e24, 1e12, 1e12]; // a lot
        bals[3] = [uint256(0.05 ether), 0.01e8, 50e18, 10e6, 5e6]; // low
        bals[4] = [uint256(2 ether), 0.05e8, 3000e18, 1000e6, 800e6];
        bals[5] = [uint256(2 ether), 0.05e8, 3000e18, 1000e6, 800e6];

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
abstract contract ArbitrumSepoliaDeployment is ArbitrumSepoliaDeployConfig {
    constructor(string memory _mnemonicId) ArbitrumSepoliaDeployConfig(_mnemonicId) {}

    function createAssetConfig() internal override returns (AssetCfg memory assetCfg_) {
        assetCfg_.wethIndex = 0;

        assetCfg_.ext = EXT_ASSET_CONFIG();
        assetCfg_.kra = KR_ASSET_CONFIG();
        assetCfg_.vassets = VAULT_ASSET_CONFIG();

        string[] memory vAssetSymbols = new string[](VAULT_COUNT);
        vAssetSymbols[0] = USDC.symbol();
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
            seqFeed: address(new MockSequencerUptimeFeed()),
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
        SwapRouteSetter[] memory routing = new SwapRouteSetter[](9);
        routing[0] = SwapRouteSetter({assetIn: kissAddr, assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: kissAddr, assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: kissAddr, assetOut: krARB.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: kissAddr, assetOut: krSPY.addr, enabled: true});

        routing[3] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krSPY.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krARB.addr, enabled: true});

        routing[6] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krARB.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krSPY.addr, enabled: true});

        routing[8] = SwapRouteSetter({assetIn: krARB.addr, assetOut: krSPY.addr, enabled: true});

        facet.setSwapRoutesSCDP(routing);
        facet.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krARB.addr, assetOut: kissAddr, enabled: true})); //
        super.configureSwap(_kreskoAddr, _assetsOnChain);
    }

    function deployPeriphery() internal {
        state().dataProvider = new DataV1(
            IDataFacet(state().kresko),
            address(state().vault),
            address(state().kiss),
            ArbSepolia.OFFICIALLY_KRESKIAN,
            ArbSepolia.QUEST_FOR_KRESK
        );
        state().multicall = new KrMulticall(address(state().kresko), address(state().kiss), address(ArbSepolia.V3_Router02));
        state().kresko.grantRole(Role.MANAGER, address(state().multicall));
    }

    function setupUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _results) internal override {
        broadcastWith(getAddr(0));
        MockSequencerUptimeFeed(state().cfg.seqFeed).setAnswers(0, 1699456910, 1699456910);
        USDC.approve(_results.kiss.addr, type(uint256).max);
        unchecked {
            for (uint256 i; i < _userCfg.length; i++) {
                if (_userCfg[i].addr != address(0)) {
                    address user = _userCfg[i].addr;
                    payable(user).transfer(0.5 ether);
                    WETH.deposit{value: 0.5 ether}();
                    WETH.transfer(user, 0.5 ether);

                    USDC.transfer(user, 50_000e6);
                    USDCe.transfer(user, 50_000e6);
                    DAI.transfer(user, 2500e18);
                    WBTC.transfer(user, 0.777777e8);
                }
            }
        }
        _results.kiss.kiss.vaultMint(address(USDC), 10_000e18, getAddr(0));
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
        vm.serializeAddress(obj, "DAI", address(DAI));
        vm.serializeAddress(obj, "krETH", krETH.addr);
        vm.serializeAddress(obj, "krBTC", krBTC.addr);
        vm.serializeAddress(obj, "krSPY", krSPY.addr);
        vm.serializeAddress(obj, "krARB", krARB.addr);
        vm.serializeAddress(obj, "Vault", address(state().vault));
        vm.serializeAddress(obj, "UniswapRouter", ArbSepolia.V3_Router02);
        vm.serializeAddress(obj, "DataV1", address(state().dataProvider));
        vm.serializeAddress(obj, "Kresko", address(state().kresko));
        vm.serializeAddress(obj, "Multicall", address(state().multicall));
        vm.serializeAddress(obj, "GatingManager", address(state().gatingManager));
        string memory output = vm.serializeAddress(obj, "Factory", address(state().factory));
        vm.writeJson(output, "./out/arbitrum-sepolia.json");
        Log.clg("Deployment JSON written to: ./out/arbitrum-sepolia.json");
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum-sepolia.json"));
        return vm.parseJsonAddress(json, key);
    }
}
