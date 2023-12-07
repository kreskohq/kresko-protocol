// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {mvm} from "kresko-lib/utils/MinVm.s.sol";
import {Help} from "kresko-lib/utils/Libs.s.sol";
import {Asset} from "common/Types.sol";
import {Enums} from "common/Constants.sol";
import {VaultAsset} from "vault/VTypes.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;

library LibDeployConfig {
    using Help for *;

    string internal constant DEFAULT_CHAIN_CONFIGS = "configs/foundry/deploy/chains.json";
    string internal constant ASSET_CONFIG_BASE_LOCATION = "configs/foundry/deploy/chain/assets-";
    string internal constant USER_CONFIG_BASE_LOCATION = "configs/foundry/deploy/chain/users-";

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

    function getChainsJSON(string memory location) internal returns (JSON.Chains memory) {
        string memory json = mvm.readFile(location);
        return abi.decode(mvm.parseJson(json), (JSON.Chains));
    }

    function getChainJSON(string memory configId) internal returns (JSON.ChainConfig memory) {
        JSON.Chains memory chains = getChainsJSON(DEFAULT_CHAIN_CONFIGS);
        for (uint256 i; i < chains.configs.length; i++) {
            if (keccak256(bytes(chains.configs[i].configId)) == keccak256(bytes(configId))) {
                return chains.configs[i];
            }
        }
        revert("Deployment config not found");
    }

    function getAssetsJSON(string memory configId) internal returns (JSON.Assets memory) {
        string memory json = mvm.readFile(ASSET_CONFIG_BASE_LOCATION.and(configId).and(".json"));
        return abi.decode(mvm.parseJson(json), (JSON.Assets));
    }

    function getUsersJSON(string memory configId) internal returns (JSON.Users memory result) {
        string memory file = USER_CONFIG_BASE_LOCATION.and(configId).and(".json");
        if (!mvm.exists(file)) return result;

        string memory json = mvm.readFile(file);
        return abi.decode(mvm.parseJson(json), (JSON.Users));
    }

    function getVaultAssets(string memory configId) internal returns (VaultAsset[] memory) {
        JSON.Assets memory assets = getAssetsJSON(configId);
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

    function getTickerJSON(
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
        ticker = getTickerJSON(_tickers, _assetTicker);
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

    function toAsset(JSON.AssetConfig memory jsonData) internal pure returns (Asset memory result) {
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

    function metadata(JSON.KrAssetConfig memory cfg) internal pure returns (KrAssetMetadata memory) {
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
        string memory krAssetSymbol,
        string memory anchorSymbol
    ) internal pure returns (bytes32 krAssetSalt, bytes32 anchorSalt) {
        krAssetSalt = bytes32(bytes.concat(bytes(krAssetSymbol), bytes(anchorSymbol)));
        anchorSalt = bytes32(bytes.concat(bytes(anchorSymbol), bytes(krAssetSymbol)));
    }

    function pairId(address assetA, address assetB) internal pure returns (bytes32) {
        if (assetA < assetB) {
            return keccak256(abi.encodePacked(assetA, assetB));
        }
        return keccak256(abi.encodePacked(assetB, assetA));
    }

    function getBalanceConfig(
        JSON.Balance[] memory balances,
        string memory symbol
    ) internal pure returns (JSON.Balance memory) {
        for (uint256 i; i < balances.length; i++) {
            if (balances[i].symbol.equals(symbol)) {
                return balances[i];
            }
        }
        revert("Balance not found");
    }
}
