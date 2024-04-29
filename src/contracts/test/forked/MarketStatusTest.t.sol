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
import {MockMarketStatus} from "src/contracts/mocks/MockMarketStatus.sol";
import {ProtocolUpgrader} from "scripts/utils/ProtocolUpgrader.s.sol";

contract MarketStatusTest is Tested, ProtocolUpgrader {
    using Log for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    IKresko kresko = IKresko(0x0000000000177abD99485DCaea3eFaa91db3fe72);

    address safe = 0x266489Bde85ff0dfe1ebF9f0a7e6Fed3a973cEc3;

    CommonConfigFacet config;
    CommonStateFacet state;
    MockMarketStatus provider;

    function setUp() public pranked(safe) {
        vm.createSelectFork("arbitrum", 205696320);

        // Deploy new facets and market status
        config = new CommonConfigFacet();
        state = new CommonStateFacet();
        provider = new MockMarketStatus();

        // Update CommonConfigFacet
        bytes4[] memory selectors = getSelectors("CommonConfigFacet");
        address oldFacet = kresko.facetAddress(selectors[0]);
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

        // Remove State facet
        cuts[0] = FacetCut({facetAddress: address(0), action: FacetCutAction.Remove, functionSelectors: oldSelectors});
        kresko.diamondCut(cuts, address(0), "");
        // Add State facet
        cuts[0] = FacetCut(address(state), FacetCutAction.Add, selectors);
        kresko.diamondCut(cuts, address(0), "");

        // Set Market Status Provider
        kresko.getMarketStatusProvider().eq(address(0));

        kresko.setMarketStatusProvider(address(provider));
    }

    function test_Facets_Update() external {
        kresko.getMarketStatusProvider().eq(address(provider));
        kresko.getPythEndpoint().notEq(address(0));
        kresko.getFeeRecipient().eq(safe);
        kresko.getGatingManager().notEq(address(0));
    }
}
