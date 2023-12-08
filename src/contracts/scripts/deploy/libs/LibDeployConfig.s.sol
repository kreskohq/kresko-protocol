// solhint-disable state-visibility
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {mvm} from "kresko-lib/utils/MinVm.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {Asset} from "common/Types.sol";
import {Enums} from "common/Constants.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import "scripts/deploy/libs/JSON.s.sol" as JSON;
import {CONST} from "scripts/deploy/libs/CONST.s.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";

library LibDeployConfig {
    using Help for *;
    using LibDeploy for string;
    using LibDeployConfig for *;
    using Deployed for *;

    struct KrAssetMetadata {
        string name;
        string symbol;
        string anchorName;
        string anchorSymbol;
        bytes32 krAssetSalt;
        bytes32 anchorSalt;
    }

    function getVaultAssets(JSON.Config memory json) internal view returns (VaultAsset[] memory) {
        uint256 vaultAssetCount;
        for (uint256 i; i < json.assets.extAssets.length; i++) {
            if (json.assets.extAssets[i].isVaultAsset) vaultAssetCount++;
        }
        VaultAsset[] memory result = new VaultAsset[](vaultAssetCount);

        uint256 current;
        for (uint256 i; i < json.assets.extAssets.length; i++) {
            if (json.assets.extAssets[i].isVaultAsset) {
                result[current].token = IERC20(json.assets.extAssets[i].symbol.cached());
                result[current].feed = json.getFeed(json.assets.extAssets[i].vault.feed);
                result[current].withdrawFee = json.assets.extAssets[i].vault.withdrawFee;
                result[current].depositFee = json.assets.extAssets[i].vault.depositFee;
                result[current].maxDeposits = json.assets.extAssets[i].vault.maxDeposits;
                result[current].staleTime = json.assets.extAssets[i].vault.staleTime;
                result[current].enabled = json.assets.extAssets[i].vault.enabled;

                current++;
            }
        }

        return result;
    }

    function getTicker(JSON.Config memory json, string memory _ticker) internal pure returns (JSON.TickerConfig memory) {
        for (uint256 i; i < json.assets.tickers.length; i++) {
            if (json.assets.tickers[i].ticker.equals(_ticker)) {
                return json.assets.tickers[i];
            }
        }

        revert(string.concat("!feed: ", _ticker));
    }

    function getFeeds(
        JSON.Config memory json,
        string memory _assetTicker,
        Enums.OracleType[] memory _assetOracles
    ) internal pure returns (address[2] memory) {
        JSON.TickerConfig memory ticker = json.getTicker(_assetTicker);
        return [ticker.getFeed(_assetOracles[0]), ticker.getFeed(_assetOracles[1])];
    }

    function getFeed(JSON.Config memory json, string[] memory config) internal pure returns (IAggregatorV3) {
        return IAggregatorV3(json.getTicker(config[0]).getFeed(config[1]));
    }

    function getFeed(JSON.TickerConfig memory ticker, string memory oracle) internal pure returns (address) {
        if (oracle.equals("chainlink")) {
            return ticker.chainlink;
        }
        if (oracle.equals("api3")) {
            return ticker.api3;
        }
        if (oracle.equals("vault")) {
            return ticker.vault;
        }
        if (oracle.equals("redstone")) {
            return address(0);
        }
        return address(0);
    }

    function getFeed(JSON.TickerConfig memory ticker, Enums.OracleType oracle) internal pure returns (address) {
        if (oracle == Enums.OracleType.Chainlink) {
            return ticker.chainlink;
        }
        if (oracle == Enums.OracleType.API3) {
            return ticker.api3;
        }
        if (oracle == Enums.OracleType.Vault) {
            return ticker.vault;
        }
        if (oracle == Enums.OracleType.Redstone) {
            return address(0);
        }
        return address(0);
    }

    function toAsset(JSON.AssetJSON memory assetJson) internal view returns (Asset memory result) {
        assembly {
            result := assetJson
        }
        if (assetJson.ticker.equals("KISS")) {
            result.anchor = assetJson.ticker.cached();
        }
        result.oracles = [assetJson.oracles[0], assetJson.oracles[1]];
        result.ticker = bytes32(bytes(assetJson.ticker));
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
        name = string.concat(CONST.KRASSET_NAME_PREFIX, krAssetName);
        symbol = krAssetSymbol;
    }

    function getAnchorSymbolAndName(
        string memory krAssetName,
        string memory krAssetSymbol
    ) internal pure returns (string memory name, string memory symbol) {
        name = string.concat(CONST.ANCHOR_NAME_PREFIX, krAssetName);
        symbol = string.concat(CONST.ANCHOR_SYMBOL_PREFIX, krAssetSymbol);
    }

    function getKrAssetSalts(
        string memory krAssetSymbol,
        string memory anchorSymbol
    ) internal pure returns (bytes32 krAssetSalt, bytes32 anchorSalt) {
        krAssetSalt = bytes32(bytes.concat(bytes(krAssetSymbol), bytes(anchorSymbol)));
        anchorSalt = bytes32(bytes.concat(bytes(anchorSymbol), bytes(krAssetSymbol)));
    }

    function mockTokenSalt(string memory symbol) internal pure returns (bytes32) {
        return bytes32(bytes(symbol));
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
