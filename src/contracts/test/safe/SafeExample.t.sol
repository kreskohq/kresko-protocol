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
import {SafeExample} from "scripts/SafeExample.s.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract SafeExampleTest is SafeExample, Tested {
    using Log for *;
    using Help for *;

    bytes32 pyth_eth = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    function test_payload0002() public {
        payload0002();

        fetchPythAndUpdate();
        vm.warp(pythEP.getPriceUnsafe(pyth_eth).timestamp);
        for (uint256 i; i < tickers.length; i++) {
            uint256 price = kresko.getPythPrice(tickers[i]);
            assertTrue(price > 0, "price is 0");
        }
        vm.warp(pythEP.getPriceUnsafe(pyth_eth).timestamp + 31);
        for (uint256 i; i < tickers.length; i++) {
            vm.expectRevert(0x19abf40e); // pyth StalePrice selector
            kresko.getPythPrice(tickers[i]);
        }
    }
}
