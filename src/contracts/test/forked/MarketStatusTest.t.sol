// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Log, Help} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {IKresko} from "periphery/IKresko.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {FacetCut, FacetCutAction} from "diamond/DSTypes.sol";
import {CommonConfigFacet} from "common/facets/CommonConfigFacet.sol";
import {CommonStateFacet} from "common/facets/CommonStateFacet.sol";
import {AssetStateFacet} from "common/facets/AssetStateFacet.sol";
import {MockMarketStatus} from "src/contracts/mocks/MockMarketStatus.sol";
import {ProtocolUpgrader, ArbDeployAddr} from "scripts/utils/ProtocolUpgrader.s.sol";
import {IDataV1} from "periphery/interfaces/IDataV1.sol";
import {console} from "forge-std/console.sol";
import {DataV2} from "periphery/DataV2.sol";
import {DataV1} from "periphery/DataV1.sol";
import {IMarketStatus} from "common/interfaces/IMarketStatus.sol";

contract MarketStatusTest is Tested, ProtocolUpgrader, ArbDeployAddr {
    using Log for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    IKresko kresko = IKresko(kreskoAddr);
    DataV1 dataV1 = DataV1(dataV1Addr);

    DataV2 dataV2;
    CommonConfigFacet config;
    CommonStateFacet state;
    AssetStateFacet assetState;

    IMarketStatus provider = IMarketStatus(0xf6188e085ebEB716a730F8ecd342513e72C8AD04);

    function setUp() public pranked(safe) {
        vm.createSelectFork("arbitrum", 206380985); // Market status already running at this block

        // Deploy new facets
        config = new CommonConfigFacet();
        state = new CommonStateFacet();
        assetState = new AssetStateFacet();

        // Update CommonConfigFacet
        bytes4[] memory selectors = getSelectors("CommonConfigFacet");
        address oldFacet = kresko.facetAddress(selectors[selectors.length - 1]);
        bytes4[] memory oldSelectors = kresko.facetFunctionSelectors(oldFacet);
        FacetCut[] memory cuts = new FacetCut[](1);
        // Remove Config facet
        cuts[0] = (FacetCut({facetAddress: address(0), action: FacetCutAction.Remove, functionSelectors: oldSelectors}));
        kresko.diamondCut(cuts, address(0), "");
        // Add Config facet
        cuts[0] = FacetCut(address(config), FacetCutAction.Add, selectors);
        kresko.diamondCut(cuts, address(0), "");

        // Update CommonStateFacet
        selectors = getSelectors("CommonStateFacet");
        oldFacet = kresko.facetAddress(selectors[0]);
        oldSelectors = kresko.facetFunctionSelectors(oldFacet);
        // Remove CommonState facet
        cuts[0] = FacetCut({facetAddress: address(0), action: FacetCutAction.Remove, functionSelectors: oldSelectors});
        kresko.diamondCut(cuts, address(0), "");
        // Add CommonState facet
        cuts[0] = FacetCut(address(state), FacetCutAction.Add, selectors);
        kresko.diamondCut(cuts, address(0), "");

        // Update AssetStateFacet
        selectors = getSelectors("AssetStateFacet");
        oldFacet = kresko.facetAddress(selectors[0]);
        oldSelectors = kresko.facetFunctionSelectors(oldFacet);
        // Remove AssetState facet
        cuts[0] = FacetCut({facetAddress: address(0), action: FacetCutAction.Remove, functionSelectors: oldSelectors});
        kresko.diamondCut(cuts, address(0), "");
        // Add AssetState facet
        cuts[0] = FacetCut(address(assetState), FacetCutAction.Add, selectors);
        kresko.diamondCut(cuts, address(0), "");

        // Set Market Status Provider
        kresko.getMarketStatusProvider().eq(address(0));

        kresko.setMarketStatusProvider(address(provider));

        dataV2 = new DataV2(address(dataV1.DIAMOND()), address(dataV1.VAULT()), address(0), address(0), address(0), address(0));
    }

    function test_Facets_Update() external {
        kresko.getMarketStatusProvider().eq(address(provider));
        kresko.getPythEndpoint().notEq(address(0));
        kresko.getFeeRecipient().eq(safe);
        kresko.getGatingManager().notEq(address(0));
    }

    function test_getMarketStatus() external {
        address[] memory assets = new address[](9);
        assets[0] = address(wethAddr);
        assets[1] = address(USDCeAddr);
        assets[2] = address(USDCAddr);
        assets[3] = address(WBTCAddr);
        assets[4] = address(ARBAddr);
        assets[5] = address(krETHAddr);
        assets[6] = address(krBTCAddr);
        assets[7] = address(krSOLAddr);
        assets[8] = address(kissAddr);

        for (uint i = 0; i < assets.length; i++) {
            kresko.getMarketStatus(assets[i]).eq(true);
        }

        vm.expectRevert();
        kresko.getMarketStatus(address(DAIAddr));
    }

    function test_Crypto_ticker_status() external {
        bytes32[] memory tickers = _getTickers();

        bool[] memory status = provider.getTickerStatuses(tickers);
        for (uint256 i = 0; i < status.length; i++) {
            status[i].eq(true);
        }

        vm.expectRevert();
        provider.getTickerStatus(bytes32("DAI"));
    }

    function test_DataV2() external {
        // All crypto assets should be always open
        DataV2.DVAsset[] memory result = dataV2.getVAssets();
        for (uint256 i = 0; i < result.length; i++) {
            result[i].isMarketOpen.eq(true);
        }
    }

    function _getTickers() internal pure returns (bytes32[] memory) {
        bytes32[] memory tickers = new bytes32[](6);
        tickers[0] = "ETH";
        tickers[1] = "BTC";
        tickers[2] = "SOL";
        tickers[3] = "ARB";
        tickers[4] = "USDC";
        tickers[5] = "KISS";

        return tickers;
    }
}
