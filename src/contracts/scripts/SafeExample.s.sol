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
import {Oracle} from "common/Types.sol";
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

    bytes32[] internal tickers = [bytes32("ETH"), bytes32("BTC"), bytes32("USDC"), bytes32("ARB")];

    modifier setUp() {
        ArbScript.initialize();
        fetchPythAndUpdate();
        _;
    }

    function payload0002() public setUp broadcasted(safe) {
        kresko.setPythFeeds(tickers, getPythConfig());
    }

    function getPythConfig() private view returns (ICommonConfigFacet.PythConfig memory pythConfig) {
        pythConfig.pythIds = new bytes32[](tickers.length);
        pythConfig.invertPyth = new bool[](tickers.length);
        pythConfig.staleTimes = new uint256[](tickers.length);
        for (uint256 i; i < tickers.length; i++) {
            Oracle memory config = kresko.getOracleOfTicker(tickers[i], Enums.OracleType.Pyth);
            pythConfig.pythIds[i] = config.pythId;
            pythConfig.invertPyth[i] = config.invertPyth;
            pythConfig.staleTimes[i] = 30;
        }
    }
}
