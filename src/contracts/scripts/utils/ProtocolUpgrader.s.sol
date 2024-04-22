// solhint-disable state-visibility
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVm, Scripted} from "kresko-lib/utils/Scripted.s.sol";
import {FacetScript, vmFFI} from "kresko-lib/utils/ffi/FacetScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IDiamondCutFacet, IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {FacetCut, Initializer} from "../../core/diamond/DSTypes.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {__revert} from "kresko-lib/utils/Base.s.sol";
import {IDiamondLoupeFacet} from "diamond/interfaces/IDiamondLoupeFacet.sol";
import {FacetCutAction} from "diamond/DSTypes.sol";
import {create1, getFacetsAndSelectors} from "scripts/deploy/DeployFuncs.s.sol";

contract ProtocolUpgrader is Scripted, FacetScript("./utils/getFunctionSelectors.sh") {
    using Log for *;
    using Help for *;
    using Deployed for *;

    IExtendedDiamondCutFacet diamond;
    FacetCut[] cuts;
    Initializer initializer;

    modifier output(string memory id) {
        LibDeploy.initOutputJSON(id);
        _;
        LibDeploy.writeOutputJSON();
    }

    function initUpgrader(address _kresko) internal {
        diamond = IExtendedDiamondCutFacet(_kresko);
    }

    function executeCuts(string memory id, bool _dry) internal {
        LibDeploy.JSONKey(("diamondCut-").and(id));
        bytes memory data = abi.encodeWithSelector(
            IDiamondCutFacet.diamondCut.selector,
            cuts,
            initializer.initContract,
            initializer.initData
        );
        LibDeploy.setJsonAddr("to", address(diamond));
        LibDeploy.setJsonBytes("calldata", data);
        LibDeploy.saveJSONKey();

        if (!_dry) {
            (bool success, bytes memory retdata) = address(diamond).call(data);
            if (!success) {
                __revert(retdata);
            }
        }
    }

    function fullUpgrade() internal {
        createFullCut();
        executeCuts("full", false);
    }

    function upgradeOrAdd(string memory artifactName) internal {
        createFacetCut(artifactName);
        executeCuts(artifactName, false);
    }

    function createFacetCut(string memory artifact) internal {
        (string[] memory files, bytes[] memory facets, bytes4[][] memory selectors) = getFacetsAndSelectors(artifact);

        require(facets.length == 1, "Only one facet should be returned");
        for (uint256 i; i < facets.length; i++) {
            handleFacet(files[i], facets[i], selectors[i]);
        }
    }

    function createFacetCut(string memory name, bytes memory facet, bytes4[] memory selectors) internal returns (address) {
        return handleFacet(name, facet, selectors);
    }

    function createFullCut() private {
        (string[] memory files, bytes[] memory facets, bytes4[][] memory selectors) = getFacetsAndSelectors();

        for (uint256 i; i < facets.length; i++) {
            handleFacet(files[i], facets[i], selectors[i]);
        }
    }

    function handleFacet(
        string memory fileName,
        bytes memory facet,
        bytes4[] memory selectors
    ) private returns (address facetAddr) {
        address oldFacet = IDiamondLoupeFacet(address(diamond)).facetAddress(selectors[0]);
        oldFacet = IDiamondLoupeFacet(address(diamond)).facetAddress(selectors[selectors.length - 1]);
        bytes4[] memory oldSelectors;
        if (oldFacet != address(0) && !fileName.equals("")) {
            bytes memory code = vm.getDeployedCode(fileName.and(".sol:").and(fileName));
            // skip if code is the same
            if (keccak256(abi.encodePacked(code)) == keccak256(abi.encodePacked(oldFacet.code))) {
                LibDeploy.JSONKey(fileName.and("-skip"));
                LibDeploy.setJsonAddr("address", oldFacet);
                LibDeploy.setJsonBool("skipped", true);
                LibDeploy.saveJSONKey();
                return oldFacet;
            }

            oldSelectors = IDiamondLoupeFacet(address(diamond)).facetFunctionSelectors(oldFacet);
            cuts.push(FacetCut({facetAddress: address(0), action: FacetCutAction.Remove, functionSelectors: oldSelectors}));
        }
        LibDeploy.JSONKey(fileName);
        LibDeploy.setJsonNumber("oldSelectors", oldSelectors.length);
        facetAddr = create1(facet);
        LibDeploy.setJsonAddr("address", facetAddr);

        cuts.push(FacetCut({facetAddress: facetAddr, action: FacetCutAction.Add, functionSelectors: selectors}));
        LibDeploy.setJsonNumber("newSelectors", selectors.length);
        LibDeploy.saveJSONKey();
    }
}
