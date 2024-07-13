// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.23;
import {Asset, CommonInitArgs} from "common/Types.sol";
import {SCDPInitArgs} from "scdp/STypes.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {Enums} from "common/Constants.sol";
import {LibJSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {Help, Utils, mAddr, mvm} from "kresko-lib/utils/s/LibVm.s.sol";
import {CONST} from "scripts/deploy/CONST.s.sol";
import {PLog} from "kresko-lib/utils/s/PLog.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
struct Files {
    string params;
    string assets;
    string users;
}

using Help for string;
using Utils for string;

function getConfig(string memory network, string memory configId) returns (Config memory json) {
    string memory dir = string.concat(CONST.CONFIG_DIR, network, "/");

    return getConfigFrom(dir, configId);
}

function getSalts(string memory network, string memory configId) returns (Salts memory) {
    string memory dir = string.concat(CONST.CONFIG_DIR, network, "/");
    string memory location = string.concat(dir, "salts-", configId, ".json");
    if (!mvm.exists(location)) {
        return Salts({kresko: bytes32("Kresko"), multicall: bytes32("Multicall")});
    }

    return abi.decode(mvm.parseJson(mvm.readFile(location)), (Salts));
}

function getConfigFrom(string memory dir, string memory configId) returns (Config memory json) {
    Files memory files;

    files.params = string.concat(dir, "params-", configId, ".json");
    if (!mvm.exists(files.params)) {
        revert(string.concat("No configuration exists: ", files.params));
    }
    files.assets = string.concat(dir, "assets-", configId, ".json");
    if (!mvm.exists(files.assets)) {
        revert(string.concat("No asset configuration exists: ", files.assets));
    }

    json.params = abi.decode(mvm.parseJson(mvm.readFile(files.params)), (Params));
    json.assets = getAssetConfigFrom(dir, configId);

    files.users = string.concat(dir, "users-", configId, ".json");
    if (mvm.exists(files.users)) {
        json.users = abi.decode(mvm.parseJson(mvm.readFile(files.users)), (Users));
    }

    if (json.params.common.admin == address(0)) {
        json.params.common.admin = mAddr("MNEMONIC_DEVNET", 0);
    }

    Deployed.init(configId);
}

// stacks too deep so need to split assets into separate function
function getAssetConfig(string memory network, string memory configId) returns (Assets memory json) {
    string memory dir = string.concat(CONST.CONFIG_DIR, network, "/");
    return getAssetConfigFrom(dir, configId);
}

function getAssetConfigFrom(string memory dir, string memory configId) returns (Assets memory) {
    Files memory files;

    files.assets = string.concat(dir, "assets-", configId, ".json");
    if (!mvm.exists(files.assets)) {
        revert(string.concat("No asset configuration exists: ", files.assets));
    }

    return abi.decode(mvm.parseJson(mvm.readFile(files.assets)), (Assets));
}

function getKrAsset(Config memory cfg, string memory symbol) pure returns (KrAssetParams memory result) {
    for (uint256 i; i < cfg.assets.kreskoAssets.length; i++) {
        if (cfg.assets.kreskoAssets[i].symbol.equals(symbol)) {
            result.json = cfg.assets.kreskoAssets[i];
            break;
        }
    }

    for (uint256 i; i < cfg.assets.extAssets.length; i++) {
        if (cfg.assets.extAssets[i].symbol.equals(result.json.underlyingSymbol)) {
            result.underlying = cfg.assets.extAssets[i];
            break;
        }
    }
    for (uint256 i; i < cfg.assets.tickers.length; i++) {
        if (cfg.assets.tickers[i].ticker.equals(result.json.config.ticker)) {
            result.ticker = cfg.assets.tickers[i];
            break;
        }
    }
}

function getExtAsset(Config memory cfg, string memory symbol) pure returns (ExtAssetParams memory result) {
    for (uint256 i; i < cfg.assets.extAssets.length; i++) {
        if (cfg.assets.extAssets[i].symbol.equals(symbol)) {
            result.json = cfg.assets.extAssets[i];
            break;
        }
    }
    for (uint256 i; i < cfg.assets.tickers.length; i++) {
        if (cfg.assets.tickers[i].ticker.equals(result.json.config.ticker)) {
            result.ticker = cfg.assets.tickers[i];
            break;
        }
    }
}

struct KrAssetParams {
    KrAssetConfig json;
    ExtAsset underlying;
    TickerConfig ticker;
}
struct ExtAssetParams {
    ExtAsset json;
    TickerConfig ticker;
}

struct Salts {
    bytes32 kresko;
    bytes32 multicall;
}

struct Config {
    Params params;
    Assets assets;
    Users users;
}

struct Params {
    string configId;
    address deploymentFactory;
    CommonInitArgs common;
    SCDPInitArgs scdp;
    MinterInitArgs minter;
    Periphery periphery;
    uint8 gatingPhase;
}

struct Periphery {
    address okNFT;
    address qfkNFT;
    address v3Router;
    address quoterv2;
}

struct Assets {
    string configId;
    bool mockFeeds;
    WNative wNative;
    ExtAsset[] extAssets;
    KrAssetConfig[] kreskoAssets;
    KISSConfig kiss;
    TickerConfig[] tickers;
    TradeRouteConfig[] customTradeRoutes;
}

struct KISSConfig {
    string name;
    string symbol;
    AssetJSON config;
}

struct WNative {
    bool mocked;
    string name;
    string symbol;
    IWETH9 token;
}

struct ExtAsset {
    bool mocked;
    bool isVaultAsset;
    string name;
    string symbol;
    address addr;
    AssetJSON config;
    VaultAssetJSON vault;
}

struct TickerConfig {
    string ticker;
    uint256 mockPrice;
    uint8 priceDecimals;
    address chainlink;
    address api3;
    address vault;
    bytes32 pythId;
    uint256 staleTimePyth;
    uint256 staleTimeAPI3;
    uint256 staleTimeChainlink;
    uint256 staleTimeRedstone;
    bool useAdapter;
    bool invertPyth;
    bool isClosable;
}

struct Balance {
    uint256 user;
    string symbol;
    uint256 amount;
    address assetsFrom;
}

struct MinterPosition {
    uint256 user;
    string depositSymbol;
    uint256 depositAmount;
    address assetsFrom;
    string mintSymbol;
    uint256 mintAmount;
}

struct SCDPPosition {
    uint256 user;
    uint256 kissDeposits;
    string vaultAssetSymbol;
    address assetsFrom;
}

struct TradeRouteConfig {
    string assetA;
    string assetB;
    bool enabled;
}

struct Account {
    uint32 idx;
    address addr;
}

struct NFTSetup {
    bool useMocks;
    address nftsFrom;
    uint256 userCount;
}

struct Users {
    string configId;
    string mnemonicEnv;
    Account[] accounts;
    Balance[] balances;
    SCDPPosition[] scdp;
    MinterPosition[] minter;
    NFTSetup nfts;
}

/// @notice forge cannot parse structs with fixed arrays so we use this intermediate struct
struct AssetJSON {
    string ticker;
    address anchor;
    Enums.OracleType[] oracles;
    uint16 factor;
    uint16 kFactor;
    uint16 openFee;
    uint16 closeFee;
    uint16 liqIncentive;
    uint256 maxDebtMinter;
    uint256 maxDebtSCDP;
    uint256 depositLimitSCDP;
    uint16 swapInFeeSCDP;
    uint16 swapOutFeeSCDP;
    uint16 protocolFeeShareSCDP;
    uint16 liqIncentiveSCDP;
    uint8 decimals;
    bool isMinterCollateral;
    bool isMinterMintable;
    bool isSharedCollateral;
    bool isSwapMintable;
    bool isSharedOrSwappedCollateral;
    bool isCoverAsset;
}

struct VaultAssetJSON {
    string[] feed;
    uint24 staleTime;
    uint32 depositFee;
    uint32 withdrawFee;
    uint248 maxDeposits;
    bool enabled;
}

struct KrAssetConfig {
    string name;
    string symbol;
    string underlyingSymbol;
    uint48 wrapFee;
    uint40 unwrapFee;
    AssetJSON config;
}

function get(Users memory users, uint256 i) returns (address) {
    Account memory acc = users.accounts[i];
    if (acc.addr == address(0)) {
        return mAddr(users.mnemonicEnv, acc.idx);
    }
    return acc.addr;
}

uint256 constant ALL_USERS = 9999;

using {get} for Users global;
using {LibJSON.getMockPrices} for Config global;

using {LibJSON.metadata} for KrAssetConfig global;
using {LibJSON.toAsset} for AssetJSON global;
