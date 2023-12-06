// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.23;
import {CommonInitArgs} from "common/Types.sol";
import {SCDPInitArgs} from "scdp/STypes.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {Enums} from "common/Constants.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";

struct Chains {
    ChainConfig[] configs;
}

struct PeripheryConfig {
    address officallyKreskianNFT;
    address questForKreskNFT;
    address v3SwapRouter02;
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
    string mockRedstoneStr;
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

struct BalanceConfig {
    string symbol;
    uint256 amount;
}

struct MinterUserConfig {
    string depositSymbol;
    uint256 collAmount;
    string mintSymbol;
    uint256 mintAmount;
}

struct TradeRouteConfig {
    string assetA;
    string assetB;
    bool enabled;
}

struct UserConfig {
    string configId;
    uint256 chainId;
    uint32[] users;
    BalanceConfig[] balances;
    uint256 kissAmount;
    uint256 kissDepositAmount;
    MinterUserConfig[] minter;
    bool useMockTokens;
    bool useMockNFTs;
    string setupCommand;
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

using {LibDeployConfig.metadata} for KrAssetConfig global;

using {LibDeployConfig.toAsset} for AssetConfig global;
