// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {vm} from "kresko-lib/utils/IMinimalVM.sol";
import {Help} from "kresko-lib/utils/Libs.sol";
import {Asset, CommonInitArgs} from "common/Types.sol";
import {SCDPInitArgs} from "scdp/STypes.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {Enums} from "common/Constants.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";

library LibConfig {
    using Help for *;

    string internal constant DEFAULT_CHAIN_CONFIGS = "src/contracts/scripts/deploy/config/json/chains.json";
    string internal constant ASSET_CONFIG_BASE_LOCATION = "src/contracts/scripts/deploy/config/json/chain/assets-";
    string internal constant USER_CONFIG_BASE_LOCATION = "src/contracts/scripts/deploy/config/json/chain/users-";

    bytes32 internal constant KISS_SALT = bytes32("KISS");
    bytes32 internal constant VAULT_SALT = bytes32("vKISS");

    string internal constant KRASSET_NAME_PREFIX = "Kresko: ";
    string internal constant KISS_PREFIX = "Kresko: ";

    string internal constant ANCHOR_NAME_PREFIX = "Kresko Asset Anchor: ";
    string internal constant ANCHOR_SYMBOL_PREFIX = "a";

    string internal constant VAULT_NAME_PREFIX = "Kresko Vault: ";

    struct KrAssetMetadata {
        string name;
        string symbol;
        string anchorName;
        string anchorSymbol;
        bytes32 krAssetSalt;
        bytes32 anchorSalt;
    }

    function getChainConfigs(string memory location) internal returns (JSON.Chains memory) {
        string memory json = vm.readFile(location);
        return abi.decode(vm.parseJson(json), (JSON.Chains));
    }

    function getChainConfig(string memory configId) internal returns (JSON.ChainConfig memory) {
        JSON.Chains memory chains = getChainConfigs(DEFAULT_CHAIN_CONFIGS);
        for (uint256 i; i < chains.configs.length; i++) {
            if (keccak256(bytes(chains.configs[i].configId)) == keccak256(bytes(configId))) {
                return chains.configs[i];
            }
        }
        revert("Deployment config not found");
    }

    function getAssetConfig(string memory configId) internal returns (JSON.Assets memory) {
        string memory json = vm.readFile(ASSET_CONFIG_BASE_LOCATION.and(configId).and(".json"));
        return abi.decode(vm.parseJson(json), (JSON.Assets));
    }

    function getUserConfig(string memory configId) internal returns (JSON.UserConfig memory result) {
        string memory file = USER_CONFIG_BASE_LOCATION.and(configId).and(".json");
        if (!vm.exists(file)) return result;

        string memory json = vm.readFile(file);
        return abi.decode(vm.parseJson(json), (JSON.UserConfig));
    }

    function getVaultAssetConfig(string memory configId) internal returns (VaultAsset[] memory) {
        JSON.Assets memory assets = getAssetConfig(configId);
        uint256 vaultAssetCount;
        for (uint256 i; i < assets.extAssets.length; i++) {
            if (address(assets.extAssets[i].vault.token) != address(0)) {
                vaultAssetCount++;
            }
        }
        VaultAsset[] memory result = new VaultAsset[](vaultAssetCount);

        uint256 current;
        for (uint256 i; i < assets.extAssets.length; i++) {
            if (address(assets.extAssets[i].vault.token) != address(0)) {
                result[current] = assets.extAssets[i].vault;
                current++;
            }
        }

        return result;
    }

    function getTicker(
        JSON.TickerConfig[] memory _tickers,
        string memory _assetTicker
    ) internal pure returns (JSON.TickerConfig memory) {
        for (uint256 i; i < _tickers.length; i++) {
            if (_tickers[i].ticker.equals(_assetTicker)) {
                return _tickers[i];
            }
        }

        revert("Feed not found");
    }

    function getOracle(
        string memory _assetTicker,
        Enums.OracleType[] memory _assetOracles,
        JSON.TickerConfig[] memory _tickers
    ) internal pure returns (JSON.TickerConfig memory ticker, address[2] memory feeds) {
        ticker = getTicker(_tickers, _assetTicker);
        feeds = [getFeed(_assetOracles[0], ticker), getFeed(_assetOracles[1], ticker)];
    }

    function getFeed(Enums.OracleType oracle, JSON.TickerConfig memory ticker) internal pure returns (address) {
        if (oracle == Enums.OracleType.Chainlink) {
            return ticker.chainlink;
        }
        if (oracle == Enums.OracleType.API3) {
            return ticker.api3;
        }
        if (oracle == Enums.OracleType.Vault) {
            return ticker.vault;
        }
        return address(0);
    }

    function toAsset(JSONAssetConfig memory jsonData) internal pure returns (Asset memory result) {
        assembly {
            result := jsonData
        }
        result.oracles = [jsonData.oracles[0], jsonData.oracles[1]];
        result.ticker = bytes32(bytes(jsonData.ticker));
    }

    function feedBytesId(string memory ticker) internal pure returns (bytes32) {
        return bytes32(bytes(feedStringId(ticker)));
    }

    function feedStringId(string memory ticker) internal pure returns (string memory) {
        return string.concat(ticker, ".feed");
    }

    function getKrAssetMetadata(JSON.KrAssetConfig memory cfg) internal pure returns (KrAssetMetadata memory) {
        (string memory name, string memory symbol) = getKrAssetNameAndSymbol(cfg.name, cfg.symbol);
        (string memory anchorName, string memory anchorSymbol) = getAnchorSymbolAndName(cfg.name, cfg.symbol);
        (bytes32 krAssetSalt, bytes32 anchorSalt) = getKrAssetSalts(symbol, anchorSymbol);

        return
            KrAssetMetadata({
                name: name,
                symbol: symbol,
                anchorName: anchorName,
                anchorSymbol: anchorSymbol,
                krAssetSalt: krAssetSalt,
                anchorSalt: anchorSalt
            });
    }

    function getKrAssetNameAndSymbol(
        string memory krAssetName,
        string memory krAssetSymbol
    ) internal pure returns (string memory name, string memory symbol) {
        name = string.concat(KRASSET_NAME_PREFIX, krAssetName);
        symbol = krAssetSymbol;
    }

    function getAnchorSymbolAndName(
        string memory krAssetName,
        string memory krAssetSymbol
    ) internal pure returns (string memory name, string memory symbol) {
        name = string.concat(ANCHOR_NAME_PREFIX, krAssetName);
        symbol = string.concat(ANCHOR_SYMBOL_PREFIX, krAssetSymbol);
    }

    function getKrAssetSalts(
        string memory symbol,
        string memory anchorSymbol
    ) internal pure returns (bytes32 krAssetSalt, bytes32 anchorSalt) {
        krAssetSalt = bytes32(bytes.concat(bytes(symbol), bytes(anchorSymbol)));
        anchorSalt = bytes32(bytes.concat(bytes(anchorSymbol), bytes(symbol)));
    }

    function pairId(address assetA, address assetB) internal pure returns (bytes32) {
        if (assetA < assetB) {
            return keccak256(abi.encodePacked(assetA, assetB));
        }
        return keccak256(abi.encodePacked(assetB, assetA));
    }
}

library JSON {
    struct Chains {
        uint32 version;
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

    struct KrAssetConfig {
        string name;
        string symbol;
        address underlyingAddr;
        uint48 wrapFee;
        uint40 unwrapFee;
        JSONAssetConfig config;
    }

    struct KISSConfig {
        string name;
        string symbol;
        JSONAssetConfig config;
    }

    struct ExtAssetConfig {
        string name;
        string symbol;
        address addr;
        JSONAssetConfig config;
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

    struct UserAmountConfig {
        string symbol;
        uint256 amount;
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
        uint256 lowBalanceFactor;
        uint256 highBalanceFactor;
        UserAmountConfig[] extAmounts;
        uint256 kissAmount;
        uint256 kissDepositAmount;
        UserAmountConfig[] mintAmounts;
    }
}

/// @notice forge cannot parse structs with fixed arrays so we use this intermediate struct
struct JSONAssetConfig {
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

using {LibConfig.toAsset} for JSONAssetConfig global;
