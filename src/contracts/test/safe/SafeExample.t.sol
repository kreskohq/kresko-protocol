// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {SwapRouteSetter} from "scdp/STypes.sol";
import {scdp} from "scdp/SState.sol";
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {deployPayload} from "scripts/payloads/Payloads.sol";
import {IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {ICommonConfigFacet} from "common/interfaces/ICommonConfigFacet.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Enums} from "common/Constants.sol";
import {Asset, Oracle} from "common/Types.sol";
import {console} from "forge-std/console.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {View} from "periphery/ViewTypes.sol";
import {getMockPythViewPrices, PythView} from "vendor/pyth/PythScript.sol";
// solhint-disable no-empty-blocks, reason-string, state-visibility

contract SafeExampleTest is ArbScript, Tested {
    using Log for *;
    using Help for *;

    modifier setUp() {
        ArbScript.initialize();
        fetchPythAndUpdate();
        _;
    }

    function test_payload0003() public setUp broadcasted(safe) {
        _checkStaleTime(60);

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

        _checkStaleTime(30);
    }

    function _checkStaleTime(uint256 staleTime) internal view {
        address[] memory assets = new address[](4);
        assets[0] = wethAddr;
        assets[1] = WBTCAddr;
        assets[2] = USDCAddr;
        assets[3] = ARBAddr;

        for (uint256 i; i < assets.length; i++) {
            Asset memory config = kresko.getAsset(assets[i]);
            Oracle memory primaryOracle = kresko.getOracleOfTicker(config.ticker, config.oracles[0]);
            assertEq(primaryOracle.staleTime, staleTime);
        }
    }
}
