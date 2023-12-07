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

import {MinterConfigurationFacet} from "minter/facets/MinterConfigurationFacet.sol";
import {CommonConfigurationFacet} from "common/facets/CommonConfigurationFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";

abstract contract DeployBase {
    using LibDeploy for bytes;
    using LibDeploy for bytes32;

    uint256 internal constant FACET_COUNT = 23;
    uint256 internal constant INITIALIZER_COUNT = 3;
    bytes32 internal constant DIAMOND_SALT = bytes32("KRESKO");

    JSON.ChainConfig chainConfig;
    IKresko kresko;
    IKISS kiss;
    IVault vault;
    IDeploymentFactory factory;
    IKrMulticall multicall;
    IGatingManager gatingManager;
    IDataV1 dataV1;
    IWETH9 weth;

    function deployDiamond(JSON.ChainConfig memory _cfg) internal returns (IKresko) {
        require(address(LibDeploy.state().factory) != address(0), "KreskoForgeBase: No factory");
        (FacetCut[] memory facets, Initializer[] memory initializers) = createFacets(_cfg);
        LibDeploy.JSONKey("Kresko");
        bytes memory implementation = LibDeploy.ctor(
            type(Diamond).creationCode,
            abi.encode(_cfg.common.admin, facets, initializers)
        );
        kresko = IKresko(implementation.d3("", DIAMOND_SALT).implementation);
        LibDeploy.saveJSONKey();
        return kresko;
    }

    function createFacets(JSON.ChainConfig memory _cfg) private returns (FacetCut[] memory cuts, Initializer[] memory inits) {
        string[] memory cmd = new string[](2);
        cmd[0] = "./utils/getBytesAndSelectors.sh";
        cmd[1] = "./src/contracts/core/**/facets/*Facet.sol";

        (bytes[] memory facets, bytes4[][] memory selectors) = abi.decode(vmFFI.ffi(cmd), (bytes[], bytes4[][]));
        (uint256[] memory initIds, bytes[] memory initDatas) = getInitializers(selectors, _cfg);

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
        bytes4[][] memory selectors,
        JSON.ChainConfig memory _cfg
    ) internal pure returns (uint256[] memory initializers, bytes[] memory datas) {
        initializers = new uint256[](INITIALIZER_COUNT);
        datas = new bytes[](INITIALIZER_COUNT);
        bytes4[3] memory initSelectors = [
            CommonConfigurationFacet.initializeCommon.selector,
            MinterConfigurationFacet.initializeMinter.selector,
            SCDPConfigFacet.initializeSCDP.selector
        ];
        bytes[3] memory initDatas = [
            abi.encodeWithSelector(initSelectors[0], _cfg.common),
            abi.encodeWithSelector(initSelectors[1], _cfg.minter),
            abi.encodeWithSelector(initSelectors[2], _cfg.scdp)
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

    function deployDiamondOneTx(JSON.ChainConfig memory _cfg) internal returns (IKresko kresko_) {
        string[] memory cmd = new string[](2);
        cmd[0] = "./utils/getBytesAndSelectors.sh";
        cmd[1] = "./src/contracts/core/**/facets/*Facet.sol";

        (bytes[] memory creationCodes, bytes4[][] memory selectors) = abi.decode(vmFFI.ffi(cmd), (bytes[], bytes4[][]));
        (uint256[] memory initializers, bytes[] memory calldatas) = getInitializers(selectors, _cfg);
        kresko_ = IKresko(
            address(new DiamondBomb().create(_cfg.common.admin, creationCodes, selectors, initializers, calldatas))
        );
    }
}
