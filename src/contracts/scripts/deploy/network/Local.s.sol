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
import {DefaultDeployConfig} from "scripts/deploy/config/DefaultDeployConfig.s.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {state} from "scripts/deploy/base/DeployState.s.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {console2} from "forge-std/console2.sol";

using Help for string;

abstract contract LocalDeployment is StdCheats, DefaultDeployConfig {
    constructor(string memory _mnemonicId) DefaultDeployConfig(_mnemonicId) {}

    MockTokenInfo internal mockWBTC;
    MockTokenInfo internal mockDAI;
    MockTokenInfo internal mockUSDC;
    MockTokenInfo internal mockUSDT;
    MockOracle internal mockFeedETH;
    MockOracle internal mockFeedEUR;
    MockOracle internal mockFeedJPY;

    function createAssetConfig() internal override returns (AssetCfg memory assetCfg_) {
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

    function createCoreConfig(address _admin, address _treasury) internal override returns (CoreConfig memory cfg_) {
        cfg_ = CoreConfig({
            admin: _admin,
            seqFeed: address(new MockSequencerUptimeFeed()),
            staleTime: 86401,
            minterMcr: 150e2,
            minterLt: 140e2,
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

        SwapRouteSetter[] memory routing = new SwapRouteSetter[](9);
        routing[0] = SwapRouteSetter({assetIn: kissAddr, assetOut: krETH.addr, enabled: true});
        routing[1] = SwapRouteSetter({assetIn: kissAddr, assetOut: krBTC.addr, enabled: true});
        routing[2] = SwapRouteSetter({assetIn: kissAddr, assetOut: krEUR.addr, enabled: true});
        routing[3] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krBTC.addr, enabled: true});
        routing[4] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krJPY.addr, enabled: true});
        routing[5] = SwapRouteSetter({assetIn: krETH.addr, assetOut: krEUR.addr, enabled: true});
        routing[6] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krEUR.addr, enabled: true});
        routing[7] = SwapRouteSetter({assetIn: krBTC.addr, assetOut: krJPY.addr, enabled: true});
        routing[8] = SwapRouteSetter({assetIn: krEUR.addr, assetOut: krJPY.addr, enabled: true});

        facet.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: kissAddr, enabled: true})); //
        facet.setSwapRoutesSCDP(routing);
        super.configureSwap(_kreskoAddr, _assetsOnChain);
    }

    function setupUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _assetsOnChain) internal override {
        vm.warp(vm.unixTime());
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

        super.afterComplete();
    }

    function createMinterUser(address _account) private {
        State storage s = state();
        mintKiss(_account, 2_000e18);
        MockERC20 wbtc = s.getMockToken["WBTC"];
        MockERC20 dai = s.getMockToken["DAI"];
        wbtc.mint(_account, 0.1e8);
        dai.mint(_account, 10000e18);

        broadcastWith(_account);
        wbtc.approve(address(s.kresko), type(uint256).max);
        dai.approve(address(s.kresko), type(uint256).max);
        s.kresko.depositCollateral(_account, address(wbtc), 0.1e8);
        s.kresko.depositCollateral(_account, address(dai), 10000e18);

        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krETH"], 0.01 ether, initialPrices);
        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krJPY"], 10000 ether, initialPrices);
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
        mintKiss(_account, 10_000e18);
        uint256 liquidity = mintKiss(_account, 50_000e18);

        MockERC20 wbtc = s.getMockToken["WBTC"];
        MockERC20 dai = s.getMockToken["DAI"];
        wbtc.mint(_account, 0.1e8);
        dai.mint(_account, 10000e18);

        broadcastWith(_account);
        wbtc.approve(address(s.kresko), type(uint256).max);
        dai.approve(address(s.kresko), type(uint256).max);
        s.kresko.depositCollateral(_account, address(wbtc), 0.1e8);
        s.kresko.depositCollateral(_account, address(dai), 10000e18);
        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krETH"], 0.01 ether, initialPrices);
        call(kresko.mintKreskoAsset.selector, _account, s.getAddress["krJPY"], 10000 ether, initialPrices);

        s.kiss.approve(address(s.kresko), type(uint256).max);
        s.kresko.depositSCDP(_account, address(s.kiss), liquidity);
    }
}
