// solhint-disable state-visibility

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {FacetCut, Initializer, FacetCutAction} from "diamond/DSTypes.sol";
import {Diamond} from "diamond/Diamond.sol";

import {IKresko} from "periphery/IKresko.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {InitializerMismatch, SelectorBytecodeMismatch, DiamondBomb} from "scripts/utils/DiamondBomb.sol";

import {vmFFI} from "kresko-lib/utils/Base.s.sol";
import {JSON} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {IDeploymentFactory} from "factory/IDeploymentFactory.sol";
import {IKrMulticall} from "periphery/IKrMulticall.sol";
import {IDataV1} from "../../core/periphery/IDataV1.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";

import {MinterConfigFacet} from "minter/facets/MinterConfigFacet.sol";
import {CommonConfigFacet} from "common/facets/CommonConfigFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {CONST} from "scripts/deploy/libs/CONST.s.sol";

abstract contract DeployBase {
    using LibDeploy for bytes;
    using LibDeploy for bytes32;
    using LibDeploy for JSON.Config;

    uint256 internal constant FACET_COUNT = 23;
    uint256 internal constant INITIALIZER_COUNT = 3;

    JSON.Params paramsJSON;
    IKresko kresko;
    IKISS kiss;
    IVault vault;
    IDeploymentFactory factory;
    IKrMulticall multicall;
    IGatingManager gatingManager;
    IDataV1 dataV1;
    IWETH9 weth;

    function deployDeploymentFactory(address _deployer) internal returns (address) {
        return address(factory = LibDeploy.createFactory(_deployer));
    }

    function deployGatingManager(JSON.Config memory json, address _deployer) internal returns (address) {
        return address(gatingManager = json.createGatingManager(_deployer));
    }

    function deployDiamond(JSON.Config memory json, address _deployer) internal returns (address) {
        paramsJSON = json.params;
        require(address(LibDeploy.state().factory) != address(0), "deployDiamond: No factory");
        (FacetCut[] memory facets, Initializer[] memory initializers) = deployFacets(json);
        LibDeploy.JSONKey("Kresko");
        kresko = IKresko(
            type(Diamond)
                .creationCode
                .ctor(abi.encode(_deployer, facets, initializers))
                .d3("", CONST.DIAMOND_SALT)
                .implementation
        );
        LibDeploy.saveJSONKey();
        return address(kresko);
    }

    function deployFacets(JSON.Config memory json) private returns (FacetCut[] memory cuts, Initializer[] memory inits) {
        (bytes[] memory facets, bytes4[][] memory selectors) = getFacetsAndSelectors();
        (uint256[] memory initIds, bytes[] memory initDatas) = getInitializers(json, selectors);

        if (facets.length != selectors.length) {
            revert SelectorBytecodeMismatch(selectors.length, facets.length);
        }
        if (initIds.length != initDatas.length) {
            revert InitializerMismatch(initIds.length, initDatas.length);
        }
        cuts = new FacetCut[](facets.length);
        inits = new Initializer[](initDatas.length);
        for (uint256 i; i < facets.length; ) {
            cuts[i].action = FacetCutAction.Add;
            cuts[i].facetAddress = _create(facets[i]);
            cuts[i].functionSelectors = selectors[i];
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
        bytes4[3] memory initSelectors = [
            CommonConfigFacet.initializeCommon.selector,
            MinterConfigFacet.initializeMinter.selector,
            SCDPConfigFacet.initializeSCDP.selector
        ];
        bytes[3] memory initDatas = [
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

    function _create(bytes memory bytecode) private returns (address location) {
        assembly {
            location := create(0, add(bytecode, 0x20), mload(bytecode))
        }
    }

    function deployDiamondOneTx(JSON.Config memory json, address _deployer) internal returns (IKresko) {
        (bytes[] memory facets, bytes4[][] memory selectors) = getFacetsAndSelectors();
        (uint256[] memory initializers, bytes[] memory calldatas) = getInitializers(json, selectors);
        return (kresko = IKresko(address(new DiamondBomb().create(_deployer, facets, selectors, initializers, calldatas))));
    }

    function getFacetsAndSelectors() private returns (bytes[] memory, bytes4[][] memory) {
        string[] memory cmd = new string[](2);
        cmd[0] = "./utils/getBytesAndSelectors.sh";
        cmd[1] = "./src/contracts/core/**/facets/*Facet.sol";

        (string[] memory files, bytes4[][] memory selectors) = abi.decode(vmFFI.ffi(cmd), (string[], bytes4[][]));
        bytes[] memory facets = new bytes[](selectors.length);

        for (uint256 i; i < files.length; ) {
            (, bytes memory getCodeResult) = address(vmFFI).call(
                abi.encodeWithSignature("getCode(string)", string.concat(files[i], ".sol:", files[i]))
            );
            facets[i] = abi.decode(getCodeResult, (bytes));
            unchecked {
                i++;
            }
        }

        return (facets, selectors);
    }
}
