// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {addr, tokens, cl} from "kresko-lib/info/Arbitrum.sol";
import {DefaultDeployConfig} from "scripts/deploy/config/DefaultDeployConfig.s.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";

/**
 * @dev Arbitrum deployment using defaults
 * @dev Implements the functions that are called by launch scripts
 */
abstract contract ArbitrumDeployment is DefaultDeployConfig {
    constructor(string memory _mnemonicId) DefaultDeployConfig(_mnemonicId) {}

    function createAssetConfig() internal override senderCtx returns (AssetCfg memory assetCfg_) {
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

    function createCoreConfig(address _admin, address _treasury) internal override senderCtx returns (CoreConfig memory cfg_) {
        cfg_ = CoreConfig({
            admin: _admin,
            seqFeed: addr.CL_SEQ_UPTIME,
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

    function configureSwap(address _kreskoAddr, AssetsOnChain memory _assetsOnChain) internal override senderCtx {
        ISCDPConfigFacet facet = ISCDPConfigFacet(_kreskoAddr);
        address kissAddr = _assetsOnChain.kiss.addr;

        facet.setFeeAssetSCDP(kissAddr);

        // @todo Use assets only from _assetsOnChain
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

        facet.setSwapRoutesSCDP(routing);
        facet.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krJPY.addr, assetOut: kissAddr, enabled: true})); //
        super.configureSwap(_kreskoAddr, _assetsOnChain);
    }

    function setupUsers(UserCfg[] memory _userCfg, AssetsOnChain memory _results) internal override {}
}
