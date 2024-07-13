// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Log} from "kresko-lib/utils/s/LibVm.s.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {scdp} from "scdp/SState.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract ExamplePayload0002 is ArbDeployAddr {
    function executePayload() public {
        require(USDC.allowance(safe, kreskoAddr) == 0, "allowance not 0");
        require(!scdp().isRoute[krETHAddr][kissAddr], "route is not disabled");
        scdp().isRoute[krETHAddr][kissAddr] = true;
    }
}

contract SafeExample is ArbScript {
    using Log for *;

    modifier setUp() {
        ArbScript.initialize("MNEMONIC_DEPLOY");
        updatePyth();
        _;
    }

    function payload0002() public setUp broadcasted(safe) {
        USDC.approve(kreskoAddr, 1);
        USDC.approve(kreskoAddr, 0);
        kresko.setSingleSwapRouteSCDP(SwapRouteSetter({assetIn: krETHAddr, assetOut: kissAddr, enabled: false}));
        IExtendedDiamondCutFacet(kreskoAddr).executeInitializer(
            deployPayload(type(ExamplePayload0002).creationCode, "", 2),
            abi.encodeWithSelector(ExamplePayload0002.executePayload.selector)
        );
    }
}
