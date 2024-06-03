// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ArbDeployAddr} from "kresko-lib/info/ArbDeployAddr.sol";
import {Arrays} from "libs/Arrays.sol";
import {cs} from "common/State.sol";
import {ms} from "minter/MState.sol";

contract Task0009 is ArbDeployAddr {
    using Arrays for address[];

    function initialize() public {
        require(cs().assets[kissAddr].maxDebtMinter != 0, "zero");
        require(cs().assets[kissAddr].maxDebtMinter == 140_000 ether, "already-initialized");

        cs().assets[kissAddr].maxDebtMinter = 60_000 ether;
        ms().krAssets.pushUnique(kissAddr);
    }
}
