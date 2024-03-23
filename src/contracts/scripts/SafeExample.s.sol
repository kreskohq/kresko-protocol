// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {scdp} from "scdp/SState.sol";
import {Enums} from "common/Constants.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {ICommonConfigFacet} from "common/interfaces/ICommonConfigFacet.sol";

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
    using Help for *;

    modifier setUp() {
        ArbScript.initialize();
        fetchPythAndUpdate();
        _;
    }

    function payload0002() public setUp broadcasted(safe) {
        bytes32[] memory tickers = new bytes32[](4);
        tickers[0] = "ETH";
        tickers[1] = "BTC";
        tickers[2] = "USDC";
        tickers[3] = "ARB";

        uint256[] memory staleTimes = new uint256[](4);
        staleTimes[0] = 30;
        staleTimes[1] = 30;
        staleTimes[2] = 30;
        staleTimes[3] = 30;

        bool[] memory invertPyth = new bool[](4);

        ICommonConfigFacet.PythConfig memory pythConfig = ICommonConfigFacet.PythConfig({
            pythIds: tickers,
            staleTimes: staleTimes,
            invertPyth: invertPyth
        });

        kresko.setPythFeeds(tickers, pythConfig);
    }
}
