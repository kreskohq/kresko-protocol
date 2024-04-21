// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {scdp} from "scdp/SState.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {LibDeploy} from "scripts/deploy/libs/LibDeploy.s.sol";
import {LibJSON} from "scripts/deploy/libs/LibJSON.s.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {Payload0005} from "scripts/payloads/Payload0005.sol";
import {IVault} from "vault/interfaces/IVault.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0005 is ArbScript {
    using Log for *;
    using Help for *;
    uint256 internal currentForkId;

    function payload0005() public {
        ArbScript.initialize();
        if (currentForkId == 0) {
            currentForkId = vm.createSelectFork("arbitrum");
        }

        broadcastWith(safe);

        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(
            deployPayload(type(Payload0005).creationCode, "", 5),
            abi.encodeWithSelector(Payload0005.executePayload.selector)
        );
    }
}
