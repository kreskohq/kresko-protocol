// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.23;
import {CommonInitArgs} from "common/Types.sol";
import {SCDPInitArgs} from "scdp/STypes.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Enums} from "common/Constants.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {mAddr} from "../../../../../lib/kresko-foundry-helpers/src/utils/MinVm.s.sol";

struct Chains {
    ChainConfig[] configs;
}

struct PeripheryConfig {
    address okNFT;
    address qfkNFT;
    address v3Router;
    address wrappedNative;
}

struct ChainConfig {
    string configId;
    uint256 chainId;
    CommonInitArgs common;
    SCDPInitArgs scdp;
    MinterInitArgs minter;
    PeripheryConfig periphery;
    uint8 gatingPhase;
}

struct Assets {
    string configId;
    uint256 chainId;
    bool mocked;
    IWETH9 nativeWrapper;
    ExtAssetConfig[] extAssets;
    KrAssetConfig[] kreskoAssets;
    KISSConfig kiss;
    TickerConfig[] tickers;
    TradeRouteConfig[] customTradeRoutes;
    string rsPrices;
}

struct KISSConfig {
    string name;
    string symbol;
    AssetConfig config;
}

struct ExtAssetConfig {
    string name;
    string symbol;
    address addr;
    AssetConfig config;
    VaultAsset vault;
}

struct TickerConfig {
    string ticker;
    uint256 mockPrice;
    uint8 priceDecimals;
    address chainlink;
    address api3;
    address vault;
    bool useAdapter;
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
    uint256 chainId;
    string mnemonicEnv;
    Account[] accounts;
    Balance[] balances;
    SCDPPosition[] scdp;
    MinterPosition[] minter;
    NFTSetup nfts;
}

/// @notice forge cannot parse structs with fixed arrays so we use this intermediate struct
struct AssetConfig {
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

struct KrAssetConfig {
    string name;
    string symbol;
    address underlyingAddr;
    uint48 wrapFee;
    uint40 unwrapFee;
    AssetConfig config;
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

using {LibDeployConfig.metadata} for KrAssetConfig global;

using {LibDeployConfig.toAsset} for AssetConfig global;
