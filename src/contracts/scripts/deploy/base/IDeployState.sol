// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {KISS} from "kiss/KISS.sol";
import {Enums} from "common/Constants.sol";
import {IKreskoForgeTypes} from "scripts/utils/IKreskoForgeTypes.sol";
import {Deployment} from "factory/DeploymentFactory.sol";
import {Vault} from "vault/Vault.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {IDataV1} from "periphery/IDataV1.sol";
import {Asset} from "common/Types.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IKresko} from "periphery/IKresko.sol";
import {DeploymentFactory} from "factory/DeploymentFactory.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {GatingManager} from "periphery/GatingManager.sol";

/// @dev Stateful context for deployment scripts
interface IDeployState is IKreskoForgeTypes {
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
        GatingManager gatingManager;
        KISS kiss;
        IKresko kresko;
        Vault vault;
        DeploymentFactory factory;
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
}
