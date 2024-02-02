// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Deployment} from "factory/IDeploymentFactory.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {JSON, LibDeployConfig} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {LibSafe} from "kresko-lib/mocks/MockSafe.sol";
import {VM} from "kresko-lib/utils/LibVm.s.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {MockERC1155} from "mocks/MockERC1155.sol";
import {Help} from "kresko-lib/utils/Libs.s.sol";

library LibDeployMocks {
    using Help for *;
    using LibDeploy for bytes;
    using LibDeploy for bytes32;
    using LibDeploy for JSON.Config;
    using LibDeployConfig for *;
    bytes32 internal constant MOCKS_SLOT = keccak256("Mocks");

    bytes32 internal constant SEQ_FEED_SALT = bytes32("SEQ_FEED");

    /// @notice map tickers/symbols to deployed addresses
    struct MockState {
        address seqFeed;
        address mockSafe;
        mapping(string => MockERC20) tokens;
        mapping(string => MockOracle) feed;
        mapping(bytes32 => Deployment) deployment;
    }

    function state() internal pure returns (MockState storage s) {
        bytes32 slot = MOCKS_SLOT;
        assembly {
            s.slot := slot
        }
    }

    function createMocks(JSON.Config memory json, address deployer) internal returns (JSON.Config memory) {
        if (json.assets.wNative.mocked) {
            LibDeploy.JSONKey("wNative");
            address wNative = LibDeploy
                .d3(type(WETH9).creationCode, "", json.assets.wNative.symbol.mockTokenSalt())
                .implementation;
            json.assets.wNative.token = IWETH9(wNative);
            LibDeploy.saveJSONKey();
        }

        if (json.params.common.sequencerUptimeFeed == address(0)) {
            json.params.common.sequencerUptimeFeed = address(deploySeqFeed());
            VM.warp(VM.unixTime());
        }

        if (json.params.common.council == address(0)) {
            json.params.common.council = LibDeployMocks.deployMockSafe(deployer);
        }

        for (uint256 i; i < json.assets.extAssets.length; i++) {
            JSON.ExtAsset memory ext = json.assets.extAssets[i];
            if (ext.addr == address(json.assets.wNative.token) || ext.symbol.equals(json.assets.wNative.symbol)) {
                json.assets.extAssets[i].addr = address(json.assets.wNative.token);
                json.assets.extAssets[i].symbol = json.assets.wNative.symbol;
                continue;
            }
            if (!ext.mocked) continue;

            json.assets.extAssets[i].addr = address(deployMockToken(ext.name, ext.symbol, ext.config.decimals, 0));
        }

        if (json.assets.mockFeeds) {
            for (uint256 i; i < json.assets.tickers.length; i++) {
                JSON.TickerConfig memory ticker = json.assets.tickers[i];
                if (ticker.ticker.equals("KISS")) continue;
                json.assets.tickers[i].chainlink = address(
                    deployMockOracle(ticker.ticker, ticker.mockPrice, ticker.priceDecimals)
                );
            }
        }

        if (json.users.nfts.useMocks) {
            (json.params.periphery.okNFT, json.params.periphery.qfkNFT) = createNFTMocks();
        }

        if (json.params.common.pythEp == address(0)) {
            json.params.common.pythEp = deployMockPythEP(json, json.params.common.pythEp != address(0));
        }
        return json;
    }

    function createNFTMocks() internal returns (address kreskian, address questForKresk) {
        bytes memory implementation = abi.encodePacked(
            type(MockERC1155).creationCode,
            abi.encode(
                "Officially Kreskian",
                "KRESKO",
                "https://ipfs.io/ipfs/QmeHLMhsm18i4hP23KPa3shHKStetvd5fcrs1aMs6DZtCt/metadata/contract-metadata.json ",
                "https://ipfs.io/ipfs/QmeHLMhsm18i4hP23KPa3shHKStetvd5fcrs1aMs6DZtCt/metadata/{id}.json"
            )
        );
        bytes memory implementation2 = abi.encodePacked(
            type(MockERC1155).creationCode,
            abi.encode(
                "Quest for Kresk",
                "KRESKO",
                "https://ipfs.io/ipfs/QmcLs2GxSGF9UFpT3ynLAggfWLR2tiBFNtwVEgu3z6LJ82/metadata/contract-metadata.json",
                "https://ipfs.io/ipfs/QmcLs2GxSGF9UFpT3ynLAggfWLR2tiBFNtwVEgu3z6LJ82/metadata/{id}.json"
            )
        );

        string memory nft1 = "Officially Kreskian";
        string memory nft2 = "Quest for Kresk";

        LibDeploy.JSONKey(nft1);
        Deployment memory deployment = implementation.d3("", bytes32(bytes(nft1)));
        LibDeploy.saveJSONKey();
        LibDeploy.JSONKey(nft2);
        Deployment memory deployment2 = implementation2.d3("", bytes32(bytes(nft2)));
        LibDeploy.saveJSONKey();

        return (deployment.implementation, deployment2.implementation);
    }

    function deployMockPythEP(JSON.Config memory json, bool _realPrices) internal returns (address) {
        return address(json.createMockPythEP(_realPrices));
    }

    function deployMockOracle(string memory ticker, uint256 price, uint8 decimals) internal returns (MockOracle) {
        LibDeploy.JSONKey(LibDeployConfig.feedStringId(ticker));
        bytes memory implementation = type(MockOracle).creationCode.ctor(abi.encode(ticker, price, decimals));
        Deployment memory deployment = implementation.d3("", LibDeployConfig.feedBytesId(ticker));
        MockOracle result = MockOracle(deployment.implementation);
        LibDeploy.saveJSONKey();
        return result;
    }

    function deployMockToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) internal returns (MockERC20) {
        LibDeploy.JSONKey(symbol);

        MockERC20 result = MockERC20(
            type(MockERC20)
                .creationCode
                .ctor(abi.encode(name, symbol, decimals, initialSupply))
                .d3("", symbol.mockTokenSalt())
                .implementation
        );
        LibDeploy.saveJSONKey();
        return result;
    }

    function deploySeqFeed() internal returns (MockSequencerUptimeFeed result) {
        LibDeploy.JSONKey("SeqFeed");
        result = MockSequencerUptimeFeed(type(MockSequencerUptimeFeed).creationCode.d3("", SEQ_FEED_SALT).implementation);
        result.setAnswers(0, 1699456910, 1699456910);
        LibDeploy.saveJSONKey();
    }

    function deployMockSafe(address admin) internal returns (address result) {
        LibDeploy.JSONKey("council");
        result = address(LibSafe.createSafe(admin));
        LibDeploy.setJsonAddr("address", result);
        LibDeploy.saveJSONKey();
    }
}
