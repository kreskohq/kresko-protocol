// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript, Asset} from "scripts/utils/ArbScript.s.sol";
import {Help, Log, mvm} from "kresko-lib/utils/Libs.s.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {LibJSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {FeedConfiguration, Oracle} from "common/Types.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {Payload0003} from "scripts/payloads/Payload0003.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract krEURTask is ArbScript {
    using Log for *;
    using Help for *;
    using LibDeploy for JSON.Config;
    using LibDeploy for bytes;
    using LibJSON for JSON.Config;
    using LibJSON for JSON.AssetJSON;

    FeedConfiguration NO_NEW_FEEDS;
    uint256 currentForkId;
    modifier jsonOut(string memory id) {
        LibDeploy.initOutputJSON(id);
        _;
        LibDeploy.writeOutputJSON();
    }

    function execAll() public returns (address krEURAddr) {
        if (currentForkId == 0) {
            currentForkId = vm.createSelectFork("arbitrum");
        }
        JSON.Config memory json = JSON.getConfig("arbitrum", "arbitrum");
        broadcastWith(safe);

        (, LibDeploy.DeployedKrAsset memory deployInfo) = addKrAsset(json, "krEUR");
        address payload = deployPayload(type(Payload0003).creationCode, abi.encode(deployInfo.addr), 1);
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(payload, abi.encodeCall(Payload0003.executePayload, ()));
        return deployInfo.addr;
    }

    function addKrAsset(
        JSON.Config memory json,
        string memory symbol
    ) public jsonOut(symbol) returns (Asset memory config, LibDeploy.DeployedKrAsset memory deployInfo) {
        symbol.clg("Asset Symbol");
        json.assets.kreskoAssets.length.clg("KrAssets Configured");

        JSON.KrAssetParams memory params = JSON.getKrAsset(json, symbol);
        params.json.symbol.clg("Asset Symbol");
        params.json.config.ticker.clg("Ticker");
        deployInfo = json.deployKrAsset(params.json, kreskoAddr);

        config = params.json.config.toAsset(symbol);

        FeedConfiguration memory feedConfig = getFeedConfig(json, params.json.config, params.ticker);
        validateOracles(config.ticker, feedConfig);
        config = kresko.addAsset(deployInfo.addr, config, feedConfig);
    }

    function addExtAsset(JSON.Config memory json, string memory symbol) public returns (Asset memory config) {
        JSON.ExtAssetParams memory params = JSON.getExtAsset(json, symbol);
        config = params.json.config.toAsset(symbol);

        address assetAddr = params.json.addr;

        FeedConfiguration memory feedConfig = getFeedConfig(json, params.json.config, params.ticker);
        validateOracles(config.ticker, feedConfig);

        config = kresko.addAsset(assetAddr, config, feedConfig);
    }

    function getFeedConfig(
        JSON.Config memory json,
        JSON.AssetJSON memory asset,
        JSON.TickerConfig memory ticker
    ) public view returns (FeedConfiguration memory result) {
        bytes32 bytesTicker = bytes32(bytes(asset.ticker));
        Oracle memory primary = kresko.getOracleOfTicker(bytesTicker, asset.oracles[0]);
        Oracle memory secondary = kresko.getOracleOfTicker(bytesTicker, asset.oracles[1]);
        if (primary.pythId != bytes32(0) && secondary.feed != address(0)) {
            // no new config needs to be set, everything exists
            return result;
        }

        return json.getFeeds(ticker.ticker, asset.oracles);
    }

    function validateExtAsset(address assetAddr, Asset memory config) internal view {
        require(config.anchor == address(0), "Anchor address is not zero");
        require(config.kFactor == 0, "kFactor is not zero");
        require(!config.isMinterMintable, "cannot be minter mintable");
        require(!config.isSwapMintable, "cannot be swap mintable");
        require(kresko.validateAssetConfig(assetAddr, config), "Invalid extAsset config");
    }

    function validateNewKrAsset(
        string memory symbol,
        LibDeploy.DeployedKrAsset memory deployInfo,
        Asset memory config
    ) internal view {
        require(deployInfo.symbol.equals(symbol), "Symbol mismatch");
        require(deployInfo.addr != address(0), "Deployed address is zero");
        require(deployInfo.anchorAddr != address(0), "Anchor address is zero");
        require(config.anchor == deployInfo.anchorAddr, "Anchor address mismatch");
        require(kresko.validateAssetConfig(deployInfo.addr, config), "Invalid krAsset config");
    }

    function validateOracles(
        bytes32 ticker,
        FeedConfiguration memory feedCfg
    ) internal view returns (uint256 primaryPrice, uint256 secondaryPrice) {
        if (feedCfg.pythId == bytes32(0)) {
            require(feedCfg.feeds[0] == address(0), "Primary feed is not zero");
            require(feedCfg.feeds[1] == address(0), "Secondary feed is not zero");

            primaryPrice = kresko.getPythPrice(ticker);
            secondaryPrice = kresko.getChainlinkPrice(ticker);
        } else {
            require(feedCfg.feeds[0] == address(0), "Primary feed is not zero");
            primaryPrice = uint256(uint64(pythEP.getPriceUnsafe(feedCfg.pythId).price));
            secondaryPrice = uint256(IAggregatorV3(feedCfg.feeds[1]).latestAnswer());
        }

        require(primaryPrice != 0, "Primary price is zero");
        require(secondaryPrice != 0, "Secondary price is zero");
    }

    function afterRun(address assetAddr) internal {
        peekAsset(assetAddr, false);
    }
}
