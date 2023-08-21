// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Diamond} from "diamond/Diamond.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondOwnershipFacet} from "diamond/facets/DiamondOwnershipFacet.sol";
import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {AuthorizationFacet} from "diamond/facets/AuthorizationFacet.sol";
import {ERC165Facet} from "diamond/facets/ERC165Facet.sol";
import {DiamondHelper} from "scripts/DiamondHelper.sol";

contract ForgeUtils is DiamondHelper {
    address public kresko;

    function deployDiamond() external returns (address) {
        IDiamondCutFacet.FacetCut[] memory facets = diamondFacets();

        Diamond.Initialization[] memory initialization = new Diamond.Initialization[](1);
        initialization[0] = Diamond.Initialization({initContract: address(0), initData: ""});

        return address(new Diamond(msg.sender, facets, initialization));
    }

    function diamondFacets() public returns (IDiamondCutFacet.FacetCut[] memory) {
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](5);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondCutFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: _getSelectorsFromArtifact("DiamondCutFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondOwnershipFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: _getSelectorsFromArtifact("DiamondOwnershipFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondLoupeFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: _getSelectorsFromArtifact("DiamondLoupeFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new AuthorizationFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: _getSelectorsFromArtifact("AuthorizationFacet")
        });
        _diamondCut[4] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new ERC165Facet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: _getSelectorsFromArtifact("ERC165Facet")
        });
        return _diamondCut;
    }
}
