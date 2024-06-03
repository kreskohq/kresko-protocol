// solhint-disable state-visibility
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {mvm} from "kresko-lib/utils/MinVm.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {Asset, FeedConfiguration} from "common/Types.sol";
import {Enums} from "common/Constants.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {CONST} from "scripts/deploy/CONST.s.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";

library LibJSON {
    using Help for *;
    using LibDeploy for string;
    using LibJSON for *;
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
    ) internal pure returns (FeedConfiguration memory) {
        JSON.TickerConfig memory ticker = json.getTicker(_assetTicker);
        (uint256 staleTime1, address feed1) = ticker.getFeed(_assetOracles[0]);
        (uint256 staleTime2, address feed2) = ticker.getFeed(_assetOracles[1]);
        return
            FeedConfiguration({
                oracleIds: [_assetOracles[0], _assetOracles[1]],
                feeds: [feed1, feed2],
                pythId: ticker.pythId,
                staleTimes: [staleTime1, staleTime2],
                invertPyth: ticker.invertPyth,
                isClosable: ticker.isClosable
            });
    }

    function getFeed(JSON.Config memory json, string[] memory config) internal pure returns (IAggregatorV3) {
        (, address feed) = json.getTicker(config[0]).getFeed(config[1]);
        return IAggregatorV3(feed);
    }

    function getFeed(JSON.TickerConfig memory ticker, string memory oracle) internal pure returns (uint256, address) {
        if (oracle.equals("chainlink")) {
            return (ticker.staleTimeChainlink, ticker.chainlink);
        }
        if (oracle.equals("api3")) {
            return (ticker.staleTimeAPI3, ticker.api3);
        }
        if (oracle.equals("vault")) {
            return (0, ticker.vault);
        }
        if (oracle.equals("redstone")) {
            return (ticker.staleTimeRedstone, address(0));
        }
        if (oracle.equals("pyth")) {
            return (ticker.staleTimePyth, address(0));
        }
        return (0, address(0));
    }

    function getFeed(JSON.TickerConfig memory ticker, Enums.OracleType oracle) internal pure returns (uint256, address) {
        if (oracle == Enums.OracleType.Chainlink) {
            return (ticker.staleTimeChainlink, ticker.chainlink);
        }
        if (oracle == Enums.OracleType.API3) {
            return (ticker.staleTimeAPI3, ticker.api3);
        }
        if (oracle == Enums.OracleType.Vault) {
            return (0, ticker.vault);
        }
        if (oracle == Enums.OracleType.Redstone) {
            return (ticker.staleTimeRedstone, address(0));
        }
        if (oracle == Enums.OracleType.Pyth) {
            return (ticker.staleTimePyth, address(0));
        }
        return (0, address(0));
    }

    function toAsset(JSON.AssetJSON memory assetJson, string memory symbol) internal view returns (Asset memory result) {
        // assembly {
        //     result := assetJson
        // }
        result.ticker = bytes32(bytes(assetJson.ticker));
        if (assetJson.kFactor > 0) {
            if (symbol.equals("KISS")) {
                result.anchor = ("KISS").cached();
            } else {
                result.anchor = string.concat(CONST.ANCHOR_SYMBOL_PREFIX, symbol).cached();
            }
        }
        Enums.OracleType[2] memory oracles = [assetJson.oracles[0], assetJson.oracles[1]];
        result.oracles = oracles;
        result.factor = assetJson.factor;
        result.kFactor = assetJson.kFactor;
        result.openFee = assetJson.openFee;
        result.closeFee = assetJson.closeFee;
        result.liqIncentive = assetJson.liqIncentive;
        result.maxDebtMinter = assetJson.maxDebtMinter;
        result.maxDebtSCDP = assetJson.maxDebtSCDP;
        result.depositLimitSCDP = assetJson.depositLimitSCDP;
        result.swapInFeeSCDP = assetJson.swapInFeeSCDP;
        result.swapOutFeeSCDP = assetJson.swapOutFeeSCDP;
        result.protocolFeeShareSCDP = assetJson.protocolFeeShareSCDP;
        result.liqIncentiveSCDP = assetJson.liqIncentiveSCDP;
        result.decimals = assetJson.decimals;
        result.isMinterCollateral = assetJson.isMinterCollateral;
        result.isMinterMintable = assetJson.isMinterMintable;
        result.isSharedCollateral = assetJson.isSharedCollateral;
        result.isSwapMintable = assetJson.isSwapMintable;
        result.isSharedOrSwappedCollateral = assetJson.isSharedOrSwappedCollateral;
        result.isCoverAsset = assetJson.isCoverAsset;
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
        krAssetSalt = bytes32(bytes.concat(bytes(krAssetSymbol), bytes(anchorSymbol), CONST.SALT_ID));
        anchorSalt = bytes32(bytes.concat(bytes(anchorSymbol), bytes(krAssetSymbol), CONST.SALT_ID));
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
