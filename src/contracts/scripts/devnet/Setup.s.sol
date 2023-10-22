// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import
// solhint-disable const-name-snakecase
// solhint-disable state-visibility

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
import {addr, tokens, cl} from "kresko-lib/info/Arbitrum.sol";
import {LibTest} from "kresko-lib/utils/LibTest.sol";
import {DefaultConfig} from "./Configs.s.sol";

using LibTest for string;

/**
 * @dev Base for Arbitrum Devnet:
 * @dev Implements the functions that are called by launch scripts
 */
abstract contract ArbitrumSetup is DefaultConfig {
    constructor(string memory _mnemonicId) DefaultConfig(_mnemonicId) {}

    function createAssetConfigs() internal override returns (AssetCfg memory assetCfg_) {
        WETH = tokens.WETH;
        IERC20 WETH20 = IERC20(address(WETH));

        feeds_eth = [address(0), addr.CL_ETH];
        feeds_btc = [address(0), addr.CL_BTC];
        feeds_dai = [address(0), addr.CL_DAI];
        feeds_eur = [address(0), addr.CL_EUR];
        feeds_usdc = [address(0), addr.CL_USDC];
        feeds_usdt = [address(0), addr.CL_USDT];
        feeds_jpy = [address(0), addr.CL_JPY];

        assetCfg_.wethIndex = 0;

        string memory symbol_DAI = tokens.DAI.symbol();
        string memory symbol_USDC = tokens.USDC.symbol();
        string memory symbol_USDT = tokens.USDT.symbol();
        assetCfg_.ext = EXT_ASSET_CONFIG(
            [WETH20, tokens.WBTC, tokens.DAI, tokens.USDC, tokens.USDT],
            [WETH20.symbol(), tokens.WBTC.symbol(), symbol_DAI, symbol_USDC, symbol_USDT],
            [feeds_eth, feeds_btc, feeds_dai, feeds_usdc, feeds_usdt]
        );
        assetCfg_.kra = KR_ASSET_CONFIG(
            [address(WETH), address(tokens.WBTC), address(0), address(0)],
            [feeds_eth, feeds_btc, feeds_eur, feeds_jpy]
        );
        assetCfg_.vassets = VAULT_ASSET_CONFIG([tokens.DAI, tokens.USDC, tokens.USDT], [cl.DAI, cl.USDC, cl.USDT]);

        string[] memory vAssetSymbols = new string[](3);
        vAssetSymbols[0] = symbol_DAI;
        vAssetSymbols[1] = symbol_USDC;
        vAssetSymbols[2] = symbol_USDT;
        assetCfg_.vaultSymbols = vAssetSymbols;

        super.afterAssetConfigs(assetCfg_);
    }

    function createCoreConfig() internal override returns (CoreConfig memory cfg_) {
        address admin = getAddr(0);
        address treasury = getAddr(10);
        cfg_ = CoreConfig({
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

        deployCfg = cfg_;

        super.afterCoreConfig(cfg_);
    }

    function configureSwaps(address _kreskoAddr, address _kissAddr) internal override {
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

    function configureUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _results) internal override {
        //
    }
}

abstract contract LocalSetup is DefaultConfig {
    constructor(string memory _mnemonicId) DefaultConfig(_mnemonicId) {}

    MockTokenInfo internal mockWBTC;
    MockTokenInfo internal mockDAI;
    MockTokenInfo internal mockUSDC;
    MockTokenInfo internal mockUSDT;
    MockOracle internal mockFeedETH;
    MockOracle internal mockFeedEUR;
    MockOracle internal mockFeedJPY;

    function createAssetConfigs() internal override ctx returns (AssetCfg memory assetCfg_) {
        WETH = IWETH9(address(new WETH9()));
        IERC20 WETH20 = IERC20(address(WETH));

        mockWBTC = super.deployMockTokenAndOracle(MockConfig("WBTC", price_btc, 8, 8, false));
        mockDAI = super.deployMockTokenAndOracle(MockConfig("DAI", price_dai, 18, 8, true));
        mockUSDC = super.deployMockTokenAndOracle(MockConfig("USDC", price_usdc, 18, 8, true));
        mockUSDT = super.deployMockTokenAndOracle(MockConfig("USDT", price_usdt, 6, 8, true));

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

        assetCfg_.ext = EXT_ASSET_CONFIG(
            [WETH20, mockWBTC.asToken, mockDAI.asToken, mockUSDC.asToken, mockUSDT.asToken],
            ["WETH", mockWBTC.symbol, mockDAI.symbol, mockUSDC.symbol, mockUSDT.symbol],
            [feeds_eth, feeds_btc, feeds_dai, feeds_usdc, feeds_usdt]
        );
        assetCfg_.wethIndex = 0;

        assetCfg_.kra = KR_ASSET_CONFIG(
            [address(WETH), mockWBTC.addr, address(0), address(0)],
            [feeds_eth, feeds_btc, feeds_eur, feeds_jpy]
        );
        assetCfg_.vassets = VAULT_ASSET_CONFIG(
            [mockDAI.asToken, mockUSDC.asToken, mockUSDT.asToken],
            [mockDAI.feed, mockUSDC.feed, mockUSDT.feed]
        );
        string[] memory vAssetSymbols = new string[](3);
        vAssetSymbols[0] = mockDAI.symbol;
        vAssetSymbols[1] = mockUSDC.symbol;
        vAssetSymbols[2] = mockUSDT.symbol;
        assetCfg_.vaultSymbols = vAssetSymbols;

        super.afterAssetConfigs(assetCfg_);
    }

    function createCoreConfig() internal override ctx returns (CoreConfig memory cfg_) {
        address admin = getAddr(0);
        address treasury = getAddr(10);
        cfg_ = CoreConfig({
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

        deployCfg = cfg_;

        super.afterCoreConfig(cfg_);
    }

    function configureSwaps(address _kreskoAddr, address _kissAddr) internal override ctx {
        ISCDPConfigFacet facet = ISCDPConfigFacet(_kreskoAddr);

        facet.setFeeAssetSCDP(_kissAddr);

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

        // for full coverage, only JPY -> KISS and not KISS -> JPY
        facet.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: _kissAddr, enabled: true})); //
        facet.setSwapRoutesSCDP(routing);
    }

    function configureUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _assetsOnChain) internal override ctx {
        unchecked {
            for (uint256 i; i < _userCfg.length; i++) {
                if (_userCfg[i].addr != address(0)) {
                    UserCfg memory user = _userCfg[i];
                    for (uint256 j; j < user.bal.length; j++) {
                        if (user.bal[j] == 0) continue;
                        if (j == _assetsOnChain.wethIndex) {
                            WETH.deposit{value: user.bal[j]}();
                        } else {
                            MockERC20(_assetsOnChain.ext[j].addr).mint(user.addr, user.bal[j]);
                        }
                    }
                }
            }
        }
    }
}
