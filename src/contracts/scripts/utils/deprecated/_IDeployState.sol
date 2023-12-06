// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";
import {Enums} from "common/Constants.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {IDataV1} from "periphery/IDataV1.sol";
import {Asset} from "common/Types.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Deployment, IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {MockOracle} from "mocks/MockOracle.sol";

/// @dev Stateful context for deployment scripts
interface _IDeployState {
    struct AssetType {
        bool krAsset;
        bool collateral;
        bool scdpKrAsset;
        bool scdpDepositable;
    }

    struct CoreConfig {
        uint32 minterMcr;
        uint32 minterLt;
        uint32 scdpMcr;
        uint32 scdpLt;
        uint48 coverThreshold;
        uint48 coverIncentive;
        uint32 staleTime;
        uint8 sdiPrecision;
        uint8 oraclePrecision; // @note deprecated, removed soon
        address admin;
        address seqFeed;
        address council; // needs to be a contraaact
        address treasury;
        address gatingManager;
    }

    struct State {
        mapping(uint256 => KrAssetInfo) krAssetAt;
        mapping(uint256 => ExtAssetInfo) extAssetAt;
        mapping(string => address) getAddress;
        mapping(string => Asset) getAsset;
        mapping(string => VaultAsset) getVAsset;
        mapping(string => IERC20) getToken;
        mapping(string => address) getFeed;
        mapping(string => IAggregatorV3) getVFeed;
        mapping(string => MockERC20) getMockToken;
        mapping(string => Deployment) getDeploy;
        CoreConfig cfg;
        AssetCfg assetCfg;
        UserCfg[] userCfg;
        AssetsOnChain assetsOnChain;
        IDataV1 dataProvider;
        KrMulticall multicall;
        IGatingManager gatingManager;
        IKISS kiss;
        IKresko kresko;
        IVault vault;
        IDeploymentFactory factory;
        Deployment[] allProxies;
        IERC20[] allTokens;
        address[] allFeeds;
        WETH9 weth;
        Asset[] allAssets;
        string[] allSymbols;
        bytes32[] allTickers;
        bool logEnabled;
    }

    struct AssetsOnChain {
        uint256 wethIndex;
        ExtAssetInfo[] ext;
        KrAssetInfo[] kra;
        VaultAsset[] vassets;
        string[] vaultSymbols;
        uint256 extAssetCount;
        uint256 krAssetCount;
        uint256 vaultAssetCount;
        KISSInfo kiss;
    }

    struct DeploymentResult {
        AssetsOnChain assets;
    }

    struct AssetCfg {
        uint256 wethIndex;
        ExtAssetCfg[] ext;
        KrAssetCfg[] kra;
        VaultAsset[] vassets;
        string[] vaultSymbols;
    }
    struct UserCfg {
        address addr;
        uint256[] bal;
    }

    struct KrAssetCfg {
        string name;
        string symbol;
        bytes32 ticker;
        address underlying;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        AssetType identity;
        bool setTickerFeeds;
        uint16 protocolFeeShareSCDP;
        uint16 factor;
        uint16 kFactor;
        uint16 openFee;
        uint16 closeFee;
        uint16 swapInFeeSCDP;
        uint16 swapOutFeeSCDP;
        uint128 maxDebtMinter;
        uint128 maxDebtSCDP;
    }

    struct ExtAssetCfg {
        bytes32 ticker;
        string symbol;
        IERC20 token;
        uint16 factor;
        uint16 liqIncentive;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        AssetType identity;
        bool setTickerFeeds;
    }

    struct ExtAssetCfg2 {
        string ticker;
        string symbol;
        address token;
        uint16 factor;
        uint16 liqIncentive;
        address[2] feeds;
        Enums.OracleType[2] oracleType;
        AssetType identity;
        bool setTickerFeeds;
    }

    struct ExtAssetInfo {
        address addr;
        string symbol;
        Asset config;
        IAggregatorV3 feed;
        address feedAddr;
        IERC20 token;
    }

    struct KISSInfo {
        address addr;
        IKISS kiss;
        Asset config;
        IVault vault;
        Deployment proxy;
        address vaultAddr;
        IERC20 asToken;
    }

    struct KrAssetInfo {
        address addr;
        string symbol;
        Asset config;
        IKreskoAsset krAsset;
        IKreskoAssetAnchor anchor;
        string anchorSymbol;
        address underlyingAddr;
        address feedAddr;
        MockOracle mockFeed;
        IAggregatorV3 feed;
        Deployment krAssetProxy;
        Deployment anchorProxy;
        IERC20 asToken;
    }

    struct KrAssetDeployInfo {
        address addr;
        string symbol;
        IKreskoAsset krAsset;
        IKreskoAssetAnchor anchor;
        Deployment krAssetProxy;
        Deployment anchorProxy;
        string anchorSymbol;
        address underlyingAddr;
    }

    struct MockConfig {
        string symbol;
        uint256 price;
        uint8 dec;
        uint8 feedDec;
        bool setFeeds;
    }

    struct MockTokenInfo {
        address addr;
        string symbol;
        Asset config;
        IAggregatorV3 feed;
        address feedAddr;
        MockERC20 mock;
        MockOracle mockFeed;
        IERC20 asToken;
    }
}

function state() pure returns (_IDeployState.State storage ctx_) {
    bytes32 slot = keccak256("devnet.deploy.ctx");
    assembly {
        ctx_.slot := slot
    }
}
