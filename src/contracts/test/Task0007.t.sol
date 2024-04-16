// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Task0007} from "scripts/Task0007.s.sol";

import {IAccess} from "kresko-lib/vendor/IAccess.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract Task0007Test is Tested, Task0007 {
    using Log for *;
    using Help for *;
    using ShortAssert for *;

    address userNotElegible = address(332414213);

    function setUp() public {
        currentForkId = vm.createSelectFork("arbitrum");

        _grantRoleAndMintToUser();
    }

    function test_executePayload0007() public {
        IGatingManager currentManager = IGatingManager(kresko.getGatingManager());
        currentManager.phase().eq(1);
        currentManager.isEligible(userNotElegible).eq(false);

        payload0007();

        _grantRoleAndMintToUser();

        currentManager.phase().eq(2);
        currentManager.isEligible(userNotElegible).eq(true);
    }

    function _grantRoleAndMintToUser() internal {
        prank(nftMultisig);
        IAccess(address(kreskian)).grantRole(0x43e8266d03af0985c5e796e22decb8dc2151c5e8a7f68cdc0d56474847d60a7a, nftMultisig);
        IAccess(address(questForKresk)).grantRole(
            0x43e8266d03af0985c5e796e22decb8dc2151c5e8a7f68cdc0d56474847d60a7a,
            nftMultisig
        );

        questForKresk.mint(userNotElegible, 0, 1);
    }
}
