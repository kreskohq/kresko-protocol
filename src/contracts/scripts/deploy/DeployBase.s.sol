// solhint-disable state-visibility

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {FacetCut, Initializer, FacetCutAction} from "diamond/DSTypes.sol";
import {Diamond} from "diamond/Diamond.sol";
import {Based} from "kresko-lib/utils/Based.s.sol";
import {IKresko} from "periphery/IKresko.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {InitializerMismatch, DiamondBomb} from "scripts/utils/DiamondBomb.sol";

import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {IKrMulticall} from "periphery/IKrMulticall.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";

import {MinterConfigFacet} from "minter/facets/MinterConfigFacet.sol";
import {CommonConfigFacet} from "common/facets/CommonConfigFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {PythView} from "kresko-lib/vendor/Pyth.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {FacetData, getFacets, create1} from "kresko-lib/utils/ffi/ffi-facets.s.sol";
import {LibJSON} from "scripts/deploy/libs/LibJSON.s.sol";

abstract contract DeployBase is Based {
    using LibDeploy for bytes;
    using LibDeploy for bytes32;
    using LibDeploy for JSON.Config;
    string facetLoc = "./src/contracts/core/**/facets/*Facet.sol";

    uint256 internal constant INITIALIZER_COUNT = 3;

    JSON.Params paramsJSON;
    IKresko kresko;
    IKISS kiss;
    IVault vault;
    IDeploymentFactory factory;
    IKrMulticall multicall;
    IWETH9 weth;

    modifier saveOutput(string memory id) {
        LibDeploy.JSONKey(id);
        _;
        LibDeploy.saveJSONKey();
    }

    function deployDiamond(
        JSON.Config memory json,
        address _deployer,
        bytes32 salt
    ) internal saveOutput("Kresko") returns (address) {
        paramsJSON = json.params;
        require(address(LibDeploy.state().factory) != address(0), "No factory");
        (FacetCut[] memory facets, Initializer[] memory initializers) = deployFacets(json);

        bytes memory initCode = type(Diamond).creationCode.ctor(abi.encode(_deployer, facets, initializers));
        LibDeploy.setJsonBytes("INIT_CODE_HASH", bytes.concat(keccak256(initCode)));
        kresko = IKresko(initCode.d2("", salt).implementation);
        return address(kresko);
    }

    function deployFacets(JSON.Config memory json) private returns (FacetCut[] memory cuts, Initializer[] memory inits) {
        FacetData[] memory facets = getFacets(facetLoc);
        bytes4[][] memory selectors = new bytes4[][](facets.length);
        for (uint256 i; i < facets.length; i++) {
            selectors[i] = facets[i].selectors;
        }
        (uint256[] memory initIds, bytes[] memory initDatas) = getInitializers(json, selectors);

        if (initIds.length != initDatas.length) {
            revert InitializerMismatch(initIds.length, initDatas.length);
        }
        cuts = new FacetCut[](facets.length);
        inits = new Initializer[](initDatas.length);
        for (uint256 i; i < facets.length; ) {
            cuts[i].action = FacetCutAction.Add;
            cuts[i].facetAddress = create1(facets[i].facet);
            cuts[i].functionSelectors = facets[i].selectors;
            unchecked {
                i++;
            }
        }
        for (uint256 i; i < initDatas.length; ) {
            inits[i].initContract = cuts[initIds[i]].facetAddress;
            inits[i].initData = initDatas[i];
            unchecked {
                i++;
            }
        }
    }

    function getInitializers(
        JSON.Config memory json,
        bytes4[][] memory selectors
    ) private pure returns (uint256[] memory initializers, bytes[] memory datas) {
        initializers = new uint256[](INITIALIZER_COUNT);
        datas = new bytes[](INITIALIZER_COUNT);
        bytes4[INITIALIZER_COUNT] memory initSelectors = [
            CommonConfigFacet.initializeCommon.selector,
            MinterConfigFacet.initializeMinter.selector,
            SCDPConfigFacet.initializeSCDP.selector
        ];
        bytes[INITIALIZER_COUNT] memory initDatas = [
            abi.encodeWithSelector(initSelectors[0], json.params.common),
            abi.encodeWithSelector(initSelectors[1], json.params.minter),
            abi.encodeWithSelector(initSelectors[2], json.params.scdp)
        ];

        for (uint256 i; i < selectors.length; i++) {
            for (uint256 j; j < selectors[i].length; j++) {
                for (uint256 k; k < initSelectors.length; k++) {
                    if (selectors[i][j] == initSelectors[k]) {
                        initializers[k] = i;
                        datas[k] = initDatas[k];
                    }
                }
            }
        }
        require(initializers[INITIALIZER_COUNT - 1] != 0, "getInitializers: No initializers");
    }

    function deployDiamondOneTx(JSON.Config memory json, address _deployer) internal returns (IKresko) {
        FacetData[] memory facetDatas = getFacets(facetLoc);

        bytes[] memory facets = new bytes[](facetDatas.length);
        bytes4[][] memory selectors = new bytes4[][](facetDatas.length);

        for (uint256 i; i < facetDatas.length; i++) {
            facets[i] = facetDatas[i].facet;
            selectors[i] = facetDatas[i].selectors;
        }

        (uint256[] memory initializers, bytes[] memory calldatas) = getInitializers(json, selectors);
        return (kresko = IKresko(address(new DiamondBomb().create(_deployer, facets, selectors, initializers, calldatas))));
    }

    function updatePythLocal(JSON.TickerConfig[] memory tickers) internal {
        getMockPayload(LibJSON.getMockPrices(tickers));
        updatePyth(pyth.update, 0);
    }
}
