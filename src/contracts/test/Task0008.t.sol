// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Task0008, IKreskoAsset} from "scripts/Task0008.s.sol";

import {IAccess} from "kresko-lib/vendor/IAccess.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0008Test is Tested, Task0008 {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    function setUp() public {
        currentForkId = vm.createSelectFork("arbitrum");
    }

    function test_executePayload0008() public {
        IKreskoAsset krBTC = IKreskoAsset(krBTCAddr);
        krETH.wrappingInfo().closeFee.eq(50);
        krBTC.wrappingInfo().closeFee.eq(50);

        payload0008();

        krETH.wrappingInfo().closeFee.eq(15);
        krBTC.wrappingInfo().closeFee.eq(15);
    }
}
