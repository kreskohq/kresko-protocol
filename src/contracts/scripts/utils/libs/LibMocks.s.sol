// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {MockOracle} from "mocks/MockOracle.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Deployment, IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {LibDeploy} from "scripts/utils/libs/LibDeploy.s.sol";
import {MockSequencerUptimeFeed} from "mocks/MockSequencerUptimeFeed.sol";
import {JSON, LibConfig} from "scripts/utils/libs/LibConfig.s.sol";
import {WETH9} from "kresko-lib/token/WETH9.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {LibSafe} from "kresko-lib/mocks/MockSafe.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {MockERC1155} from "mocks/MockERC1155.sol";

library LibMocks {
    using Log for *;
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

    function createMocks(
        address admin,
        JSON.Assets memory cfg
    ) internal returns (JSON.Assets memory, address seqFeed, address council) {
        address weth9 = LibDeploy.state().factory.deployCreate3(type(WETH9).creationCode, "", bytes32("WETH9")).implementation;
        cfg.nativeWrapper = IWETH9(weth9);

        ("Deployed mock WETH").clg();
        weth9.clg("address");

        for (uint256 i; i < cfg.extAssets.length; i++) {
            JSON.ExtAssetConfig memory ext = cfg.extAssets[i];
            if (address(ext.addr) == weth9) {
                continue;
            }

            cfg.extAssets[i].addr = address(deployMockToken(ext.symbol, ext.symbol, ext.config.decimals, 0));

            ext.symbol.clg("Deployed mock token");
            cfg.extAssets[i].addr.clg("address");
        }

        for (uint256 i; i < cfg.tickers.length; i++) {
            JSON.TickerConfig memory ticker = cfg.tickers[i];
            if (address(ticker.vault) != address(0)) continue;
            cfg.tickers[i].chainlink = address(deployMockOracle(ticker.ticker, ticker.mockPrice, ticker.priceDecimals));
            ticker.ticker.clg("Deployed mock oracle");
            cfg.tickers[i].chainlink.clg("address");
        }
        return (cfg, address(deploySeqFeed()), address(deployMockSafe(admin)));
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

        Deployment memory deployment = LibDeploy.state().factory.deployCreate3(
            implementation,
            "",
            bytes32("Officially Kreskian")
        );
        Deployment memory deployment2 = LibDeploy.state().factory.deployCreate3(
            implementation2,
            "",
            bytes32("Quest for Kresk")
        );

        state().deployment[bytes32("Officially Kreskian")] = deployment;
        state().deployment[bytes32("Quest for Kresk")] = deployment2;

        return (deployment.implementation, deployment2.implementation);
    }

    function deployMockOracle(string memory ticker, uint256 price, uint8 decimals) internal returns (MockOracle) {
        bytes memory implementation = abi.encodePacked(type(MockOracle).creationCode, abi.encode(ticker, price, decimals));
        Deployment memory deployment = LibDeploy.state().factory.deployCreate3(
            implementation,
            "",
            LibConfig.feedBytesId(ticker)
        );
        MockOracle result = MockOracle(deployment.implementation);

        state().deployment[deployment.salt] = deployment;
        state().feed[ticker] = result;
        return result;
    }

    function deployMockToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) internal returns (MockERC20) {
        bytes memory implementation = abi.encodePacked(
            type(MockERC20).creationCode,
            abi.encode(name, symbol, decimals, initialSupply)
        );
        Deployment memory deployment = LibDeploy.state().factory.deployCreate3(implementation, "", mockTokenSalt(symbol));
        MockERC20 result = MockERC20(deployment.implementation);

        state().deployment[deployment.salt] = deployment;
        state().tokens[symbol] = result;
        return result;
    }

    function deploySeqFeed() internal returns (MockSequencerUptimeFeed result) {
        Deployment memory deployment = LibDeploy.state().factory.deployCreate3(
            type(MockSequencerUptimeFeed).creationCode,
            "",
            SEQ_FEED_SALT
        );
        state().deployment[deployment.salt] = deployment;
        state().seqFeed = deployment.implementation;
        result = MockSequencerUptimeFeed(deployment.implementation);
        result.setAnswers(0, 1699456910, 1699456910);
    }

    function deployMockSafe(address admin) internal returns (address) {
        return (state().mockSafe = address(LibSafe.createSafe(admin)));
    }

    function mockTokenSalt(string memory symbol) internal pure returns (bytes32) {
        return bytes32(bytes(symbol));
    }
}
