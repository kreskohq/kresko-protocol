// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {Help} from "kresko-lib/utils/Libs.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {state} from "scripts/deploy/base/DeployState.s.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {DeployLogicBase} from "scripts/deploy/base/DeployLogic.s.sol";

import {DataV1} from "periphery/DataV1.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";

using Help for string;

/**
 * @dev Default asset and price configuration
 */
abstract contract LocalDeployConfig is ScriptBase, DeployLogicBase {
    using Help for *;

    constructor(string memory _mnemonicId) ScriptBase(_mnemonicId) {}

    uint256 constant EXT_COUNT = 6;
    uint256 constant KR_COUNT = 6;
    uint256 constant VAULT_COUNT = 4;
    /* --------------------------------- assets --------------------------------- */
    // @todo remove explicit state
    IWETH9 internal WETH;
    IERC20 internal WBTC;
    IERC20 internal DAI;
    IERC20 internal USDC;
    IERC20 internal USDCe;
    IERC20 internal USDT;
    /* ------------------------------------ . ----------------------------------- */
    // @todo  remove explicit state

    KrAssetInfo internal krETH;
    KrAssetInfo internal krBTC;
    KrAssetInfo internal krJPY;
    KrAssetInfo internal krEUR;
    KrAssetInfo internal krWTI;
    KrAssetInfo internal krXAU;

    /* ------------------------------------ . ----------------------------------- */
    address[2] internal feeds_eth;
    address[2] internal feeds_btc;
    address[2] internal feeds_eur;
    address[2] internal feeds_dai;
    address[2] internal feeds_usdt;
    address[2] internal feeds_usdc;
    address[2] internal feeds_jpy;
    address[2] internal feeds_wti;
    address[2] internal feeds_xau;
    /* ------------------------------------ . ----------------------------------- */
    uint256 price_eth = 1911e8;
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
    string price_eth_rs = "ETH:1911:8";
    string price_btc_rs = "BTC:35159.01:8";
    string price_eur_rs = "EUR:1.07:8";
    string price_dai_rs = "DAI:0.9998:8";
    string price_usdc_rs = "USDC:1:8";
    string price_xau_rs = "XAU:1977.68:8";
    string price_wti_rs = "WTI:77.5:8";
    string price_usdt_rs = "USDT:1:8";
    string price_jpy_rs = "JPY:0.0067:8";

    string constant initialPrices =
        "ETH:1911:8,BTC:35159.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8;XAU:1977.68:8;WTI:77.5:8";

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
                .and(price_jpy_rs)
                .and(",")
                .and(price_xau_rs)
                .and(",")
                .and(price_wti_rs);
    }

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
        ext_[5] = ExtAssetCfg(bytes32("USDC"), _sym[5], _tokens[5], _feeds[5], OT_RS_CL, ext_default, true);
    }

    /// @notice ETH, BTC, EUR, JPY
    function KR_ASSET_CONFIG(
        address[KR_COUNT] memory _ulying,
        address[2][KR_COUNT] memory _feeds
    ) internal view returns (KrAssetCfg[] memory kra_) {
        kra_ = new KrAssetCfg[](KR_COUNT);
        kra_[0] = KrAssetCfg({
            name: "Kresko: Ether",
            symbol: "krETH",
            ticker: bytes32("ETH"),
            underlying: _ulying[0],
            feeds: _feeds[0],
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 15,
            swapOutFeeSCDP: 15
        });
        kra_[1] = KrAssetCfg({
            name: "Kresko: Bitcoin",
            symbol: "krBTC",
            ticker: bytes32("BTC"),
            underlying: _ulying[1],
            feeds: _feeds[1],
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 15,
            swapOutFeeSCDP: 15
        });
        kra_[2] = KrAssetCfg({
            name: "Kresko: Euro",
            symbol: "krEUR",
            ticker: bytes32("EUR"),
            underlying: _ulying[2],
            feeds: _feeds[2],
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 25
        });
        kra_[3] = KrAssetCfg({
            name: "Kresko: Yen",
            symbol: "krJPY",
            ticker: bytes32("JPY"),
            underlying: _ulying[3],
            feeds: _feeds[3],
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 25
        });
        kra_[4] = KrAssetCfg({
            name: "Kresko: Gold",
            symbol: "krXAU",
            ticker: bytes32("XAU"),
            underlying: _ulying[4],
            feeds: _feeds[4],
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 25
        });
        kra_[5] = KrAssetCfg({
            name: "Kresko: Crude Oil",
            symbol: "krWTI",
            ticker: bytes32("WTI"),
            underlying: _ulying[5],
            feeds: _feeds[5],
            oracleType: OT_RS_CL,
            identity: kr_default,
            setTickerFeeds: true,
            openFee: 0,
            closeFee: 50,
            swapInFeeSCDP: 25,
            swapOutFeeSCDP: 25
        });
    }

    /// @notice DAI, USDC, USDT
    function VAULT_ASSET_CONFIG(
        IERC20[VAULT_COUNT] memory _tokens,
        IAggregatorV3[VAULT_COUNT] memory _feeds
    ) internal pure returns (VaultAsset[] memory vault_) {
        vault_ = new VaultAsset[](VAULT_COUNT);
        vault_[0] = VaultAsset({
            token: _tokens[0],
            feed: _feeds[0],
            staleTime: 86401,
            decimals: 0,
            depositFee: 2,
            withdrawFee: 2,
            maxDeposits: type(uint248).max,
            enabled: true
        });
        vault_[1] = VaultAsset({
            token: _tokens[1],
            feed: _feeds[1],
            staleTime: 86401,
            decimals: 0,
            depositFee: 2,
            withdrawFee: 2,
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
        vault_[3] = VaultAsset({
            token: _tokens[3],
            feed: _feeds[3],
            staleTime: 86401,
            decimals: 0,
            depositFee: 0,
            withdrawFee: 0,
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

        WETH = IWETH9(results_.ext[0].addr);
        WBTC = results_.ext[1].token;
        DAI = results_.ext[2].token;
        USDC = results_.ext[3].token;
        USDT = results_.ext[4].token;
        USDCe = results_.ext[5].token;
    }

    /* ---------------------------------- users --------------------------------- */
    uint256 internal constant USER_COUNT = 6;

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

abstract contract LocalDeployment is StdCheats, LocalDeployConfig {
    constructor(string memory _mnemonicId) LocalDeployConfig(_mnemonicId) {}

    MockTokenInfo internal mockWBTC;
    MockTokenInfo internal mockDAI;
    MockTokenInfo internal mockUSDC;
    MockTokenInfo internal mockUSDCe;
    MockTokenInfo internal mockUSDT;
    MockOracle internal mockFeedETH;
    MockOracle internal mockFeedEUR;
    MockOracle internal mockFeedJPY;
    MockOracle internal mockFeedXAU;
    MockOracle internal mockFeedWTI;

    function createAssetConfig() internal override returns (AssetCfg memory assetCfg_) {
        WETH = IWETH9(address(new WETH9()));
        IERC20 WETH20 = IERC20(address(WETH));

        mockWBTC = super.deployMockTokenAndOracle(MockConfig("WBTC", price_btc, 8, 8, false));
        mockDAI = super.deployMockTokenAndOracle(MockConfig("DAI", price_dai, 18, 8, true));
        mockUSDC = super.deployMockTokenAndOracle(MockConfig("USDC", price_usdc, 6, 8, true));
        mockUSDCe = super.deployMockTokenAndOracle(MockConfig("USDC.e", price_usdc, 6, 8, true));
        mockUSDT = super.deployMockTokenAndOracle(MockConfig("USDT", price_usdt, 6, 8, true));

        mockFeedETH = new MockOracle("ETH", price_eth, 8);
        mockFeedEUR = new MockOracle("EUR", price_eur, 8);
        mockFeedJPY = new MockOracle("JPY", price_jpy, 8);
        mockFeedWTI = new MockOracle("WTI", price_wti, 8);
        mockFeedXAU = new MockOracle("JPY", price_xau, 8);

        feeds_eth = [address(0), address(mockFeedETH)];
        feeds_eur = [address(0), address(mockFeedEUR)];
        feeds_jpy = [address(0), address(mockFeedJPY)];
        feeds_xau = [address(0), address(mockFeedXAU)];
        feeds_wti = [address(0), address(mockFeedWTI)];
        feeds_btc = [address(0), mockWBTC.feedAddr];
        feeds_dai = [address(0), mockDAI.feedAddr];
        feeds_usdc = [address(0), mockUSDC.feedAddr];
        feeds_usdt = [address(0), mockUSDT.feedAddr];

        assetCfg_.ext = EXT_ASSET_CONFIG(
            [WETH20, mockWBTC.asToken, mockDAI.asToken, mockUSDC.asToken, mockUSDT.asToken, mockUSDCe.asToken],
            ["WETH", mockWBTC.symbol, mockDAI.symbol, mockUSDC.symbol, mockUSDT.symbol, mockUSDCe.symbol],
            [feeds_eth, feeds_btc, feeds_dai, feeds_usdc, feeds_usdt, feeds_usdc]
        );
        assetCfg_.wethIndex = 0;

        assetCfg_.kra = KR_ASSET_CONFIG(
            [address(WETH), mockWBTC.addr, address(0), address(0), address(0), address(0)],
            [feeds_eth, feeds_btc, feeds_eur, feeds_jpy, feeds_xau, feeds_wti]
        );
        assetCfg_.vassets = VAULT_ASSET_CONFIG(
            [mockDAI.asToken, mockUSDC.asToken, mockUSDT.asToken, mockUSDCe.asToken],
            [mockDAI.feed, mockUSDC.feed, mockUSDT.feed, mockUSDCe.feed]
        );

        string[] memory vAssetSymbols = new string[](VAULT_COUNT);
        vAssetSymbols[0] = mockDAI.symbol;
        vAssetSymbols[1] = mockUSDC.symbol;
        vAssetSymbols[2] = mockUSDT.symbol;
        vAssetSymbols[3] = mockUSDCe.symbol;
        assetCfg_.vaultSymbols = vAssetSymbols;

        super.afterAssetConfigs(assetCfg_);
    }

    function createCoreConfig(address _admin, address _treasury) internal override returns (CoreConfig memory cfg_) {
        cfg_ = CoreConfig({
            admin: _admin,
            seqFeed: address(new MockSequencerUptimeFeed()),
            staleTime: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
            coverThreshold: 160e2,
            coverIncentive: 1.01e4,
            scdpMcr: 200e2,
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

        SwapRouteSetter[] memory routing = new SwapRouteSetter[](20);
        routing[0] = SwapRouteSetter({assetIn: kissAddr, assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: kissAddr, assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: kissAddr, assetOut: krEUR.addr, enabled: true});
        routing[3] = SwapRouteSetter({assetIn: kissAddr, assetOut: krWTI.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: kissAddr, assetOut: krXAU.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: kissAddr, assetOut: krJPY.addr, enabled: true});
        routing[6] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krJPY.addr, enabled: true});
        routing[8] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krEUR.addr, enabled: true});
        routing[9] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krEUR.addr, enabled: true});
        routing[10] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krJPY.addr, enabled: true});
        routing[11] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krXAU.addr, enabled: true});
        routing[12] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krWTI.addr, enabled: true});
        routing[13] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krJPY.addr, enabled: true});
        routing[14] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krWTI.addr, enabled: true});
        routing[15] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krXAU.addr, enabled: true});
        routing[16] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krWTI.addr, enabled: true});
        routing[17] = SwapRouteSetter({assetIn: krJPY.addr, assetOut: krWTI.addr, enabled: true});
        routing[18] = SwapRouteSetter({assetIn: krJPY.addr, assetOut: krXAU.addr, enabled: true});
        routing[19] = SwapRouteSetter({assetIn: krWTI.addr, assetOut: krXAU.addr, enabled: true});

        facet.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krXAU.addr, assetOut: krJPY.addr, enabled: false})); //
        facet.setSwapRoutesSCDP(routing);
        super.configureSwap(_kreskoAddr, _assetsOnChain);
    }

    function setupUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _assetsOnChain) internal override {
        vm.warp(vm.unixTime());
        broadcastWith(getAddr(0));
        MockSequencerUptimeFeed(state().cfg.seqFeed).setAnswers(0, 1699456910, 1699456910);
        createDeployerBalances(getAddr(0));
        createMinterUser(getAddr(4));
        createMinterUser(getAddr(5));
        unchecked {
            for (uint256 i; i < _userCfg.length; i++) {
                if (_userCfg[i].addr != address(0)) {
                    UserCfg memory user = _userCfg[i];

                    for (uint256 j; j < user.bal.length; j++) {
                        if (user.bal[j] == 0) continue;

                        if (j == _assetsOnChain.wethIndex) {
                            broadcastWith(user.addr);
                            IWETH9(_assetsOnChain.ext[j].addr).deposit{value: user.bal[j]}();
                        } else {
                            MockERC20(_assetsOnChain.ext[j].addr).mint(user.addr, user.bal[j]);
                        }
                    }
                }
            }
        }
    }

    function deployPeriphery() internal {
        state().dataProvider = new DataV1(IDataFacet(state().kresko), address(state().vault), address(state().kiss));
        state().multicall = new KrMulticall(address(state().kresko), address(state().kiss), address(address(0)));
        state().kresko.grantRole(Role.MANAGER, address(state().multicall));
    }

    function createMinterUser(address _account) private {
        State storage s = state();
        mintKiss(_account, 2_000e6);
        MockERC20 wbtc = s.getMockToken["WBTC"];
        MockERC20 dai = s.getMockToken["DAI"];
        wbtc.mint(_account, 0.1e8);
        dai.mint(_account, 10000e18);

        broadcastWith(_account);
        wbtc.approve(address(s.kresko), type(uint256).max);
        dai.approve(address(s.kresko), type(uint256).max);
        s.kresko.depositCollateral(_account, address(wbtc), 0.1e8);
        s.kresko.depositCollateral(_account, address(dai), 10000e18);

        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krETH"], 0.01 ether, _account, initialPrices);
        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krJPY"], 10000 ether, _account, initialPrices);
    }

    function mintKiss(address _account, uint256 _amount) private returns (uint256 amountOut) {
        State storage s = state();
        VaultAsset memory fromAsset = s.getVAsset["USDC"];

        MockERC20(address(fromAsset.token)).mint(_account, _amount);

        broadcastWith(_account);
        fromAsset.token.approve(address(s.kiss), type(uint256).max);
        (amountOut, ) = s.kiss.vaultDeposit(address(fromAsset.token), _amount, _account);
    }

    function createDeployerBalances(address _account) private {
        State storage s = state();
        mintKiss(_account, 10_000e6);
        uint256 liquidity = mintKiss(_account, 50_000e6);

        MockERC20 wbtc = s.getMockToken["WBTC"];
        MockERC20 dai = s.getMockToken["DAI"];
        wbtc.mint(_account, 0.1e8);
        dai.mint(_account, 10000e18);

        broadcastWith(_account);
        wbtc.approve(address(s.kresko), type(uint256).max);
        dai.approve(address(s.kresko), type(uint256).max);
        s.kresko.depositCollateral(_account, address(wbtc), 0.1e8);
        s.kresko.depositCollateral(_account, address(dai), 10000e18);
        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krETH"], 0.01 ether, _account, initialPrices);
        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krJPY"], 10000 ether, _account, initialPrices);

        s.kiss.approve(address(s.kresko), type(uint256).max);
        s.kresko.depositSCDP(_account, address(s.kiss), liquidity);
    }
}
