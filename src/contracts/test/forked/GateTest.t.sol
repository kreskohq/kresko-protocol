// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Log, Help} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {IKresko} from "periphery/IKresko.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {IAccess} from "kresko-lib/vendor/IAccess.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";
import {GatingManager} from "periphery/GatingManager.sol";
import {IERC1155} from "common/interfaces/IERC1155.sol";
import {Errors} from "common/Errors.sol";

contract GateTest is Tested {
    using Log for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    IWETH9 nativew = IWETH9(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
    IKresko kresko = IKresko(0x0000000000177abD99485DCaea3eFaa91db3fe72);
    IGatingManager manager = IGatingManager(0x00000000685B935476005E6A7ed5E1Bf3C000B12);

    IERC1155 kreskian = IERC1155(0xAbDb949a18d27367118573A217E5353EDe5A0f1E);
    IERC1155 questForKresk = IERC1155(0x1C04925779805f2dF7BbD0433ABE92Ea74829bF6);

    GatingManager newManager;

    address USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address USDCe = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address krETH = 0x24dDC92AA342e92f26b4A676568D04d2E3Ea0abc;
    address KISS = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;

    address safe = 0x266489Bde85ff0dfe1ebF9f0a7e6Fed3a973cEc3;
    address deployer = 0x5a6B3E907b83DE2AbD9010509429683CF5ad5984;
    address nftMultisig = 0x389297F0d8C489954D65e04ff0690FC54E57Dad6;

    address acc1 = 0xf16803A6602D612b2BE9c845B2679F3A7D61ea6a;
    address acc2 = 0x99999A0B66AF30f6FEf832938a5038644a72180a;
    address acc3 = 0x7BF50060a0C3EE0ba4073CF33E39a18304A7586E;

    address userValidPhaseThree = address(1152191);
    address userValidPhaseTwo = address(225552);

    address userValidPhaseOne = address(2241242);
    address userValidPhaseOne2 = address(661246);
    address userValidPhaseOne3 = address(7774214);

    address userNotValid = address(332414213);
    address userNotValid2 = address(4444921);
    address userNotValid3 = address(1294219);

    function setUp() public {
        vm.createSelectFork("arbitrum", 191129102);

        // deploy fixed manager
        newManager = new GatingManager(safe, address(kreskian), address(questForKresk), 1);

        // update manager in the protocol storage through the safe
        prank(safe);
        kresko.setGatingManager(address(newManager));
        newManager.whitelist(acc3, true);

        // mint mainnet NFTs from NFT multisig
        prank(nftMultisig);
        IAccess(address(kreskian)).grantRole(0x43e8266d03af0985c5e796e22decb8dc2151c5e8a7f68cdc0d56474847d60a7a, nftMultisig);
        IAccess(address(questForKresk)).grantRole(
            0x43e8266d03af0985c5e796e22decb8dc2151c5e8a7f68cdc0d56474847d60a7a,
            nftMultisig
        );

        // mint phase 3 NFTs
        kreskian.mint(userValidPhaseThree, 0, 1);
        kreskian.mint(userValidPhaseTwo, 0, 1);
        kreskian.mint(userValidPhaseOne, 0, 1);
        kreskian.mint(userValidPhaseOne2, 0, 1);
        kreskian.mint(userValidPhaseOne3, 0, 1);

        // mint phase 2 NFTs
        questForKresk.mint(userValidPhaseTwo, 0, 1);
        questForKresk.mint(userValidPhaseOne, 0, 1);
        questForKresk.mint(userValidPhaseOne2, 0, 1);
        questForKresk.mint(userValidPhaseOne3, 0, 1);

        // mint phase 1 NFTs
        questForKresk.mint(userValidPhaseOne, 1, 1);
        questForKresk.mint(userValidPhaseOne2, 1, 7);
        questForKresk.mint(userValidPhaseOne3, 1, 4);

        questForKresk.mint(userNotValid2, 1, 1);
        questForKresk.mint(userNotValid3, 0, 1);
    }

    function testPhase3() external pranked(safe) {
        newManager.setPhase(3);
        newManager.phase().eq(3);

        vm.expectRevert(Errors.MISSING_PHASE_3_NFT.selector);
        newManager.check(userNotValid);
        newManager.isEligible(userNotValid).eq(false, "userNotValid");

        vm.expectRevert(Errors.MISSING_PHASE_3_NFT.selector);
        newManager.check(userNotValid2);
        newManager.isEligible(userNotValid2).eq(false, "userNotValid2");

        vm.expectRevert(Errors.MISSING_PHASE_3_NFT.selector);
        newManager.check(userNotValid3);
        newManager.isEligible(userNotValid3).eq(false, "userNotValid3");

        newManager.isEligible(userValidPhaseThree).eq(true);
        newManager.isEligible(userValidPhaseTwo).eq(true);
        newManager.isEligible(userValidPhaseOne).eq(true);
        newManager.isEligible(userValidPhaseOne2).eq(true);
        newManager.isEligible(userValidPhaseOne3).eq(true);
        newManager.check(userValidPhaseThree);
        newManager.check(userValidPhaseTwo);
        newManager.check(userValidPhaseOne);
        newManager.check(userValidPhaseOne2);
        newManager.check(userValidPhaseOne3);

        newManager.isEligible(acc1).eq(true);
        newManager.isEligible(acc2).eq(true);
        newManager.isEligible(acc3).eq(true);
        newManager.check(acc1);
        newManager.check(acc2);
        newManager.check(acc3);
    }

    function testPhase2() external pranked(safe) {
        newManager.setPhase(2);
        newManager.phase().eq(2);

        newManager.isEligible(userNotValid).eq(false, "userNotValid");
        newManager.isEligible(userNotValid2).eq(false, "userNotValid2");
        newManager.isEligible(userNotValid3).eq(false, "userNotValid3");
        newManager.isEligible(userValidPhaseThree).eq(false, "userValidPhaseThree");

        vm.expectRevert(Errors.MISSING_PHASE_2_NFT.selector);
        newManager.check(userNotValid);

        vm.expectRevert(Errors.MISSING_PHASE_2_NFT.selector);
        newManager.check(userNotValid2);

        vm.expectRevert(Errors.MISSING_PHASE_2_NFT.selector);
        newManager.check(userNotValid3);

        vm.expectRevert(Errors.MISSING_PHASE_2_NFT.selector);
        newManager.check(userValidPhaseThree);

        newManager.isEligible(userValidPhaseTwo).eq(true, "userValidPhaseTwo");
        newManager.isEligible(userValidPhaseOne).eq(true, "userValidPhaseOne");
        newManager.isEligible(userValidPhaseOne2).eq(true, "userValidPhaseOne2");
        newManager.isEligible(userValidPhaseOne3).eq(true, "userValidPhaseOne3");
        newManager.check(userValidPhaseTwo);
        newManager.check(userValidPhaseOne);
        newManager.check(userValidPhaseOne2);
        newManager.check(userValidPhaseOne3);

        newManager.isEligible(acc1).eq(true, "acc1");
        newManager.isEligible(acc2).eq(true, "acc2");
        newManager.isEligible(acc3).eq(true, "acc3");
        newManager.check(acc1);
        newManager.check(acc2);
        newManager.check(acc3);
    }

    function testPhase1() external pranked(safe) {
        newManager.phase().eq(1);
        newManager.isEligible(userNotValid).eq(false, "userNotValid");
        newManager.isEligible(userNotValid2).eq(false, "userNotValid2");
        newManager.isEligible(userNotValid3).eq(false, "userNotValid3");
        newManager.isEligible(userValidPhaseThree).eq(false, "userValidPhaseThree");
        newManager.isEligible(userValidPhaseTwo).eq(false, "userValidPhaseTwo");

        vm.expectRevert(Errors.MISSING_PHASE_1_NFT.selector);
        newManager.check(userNotValid);

        vm.expectRevert(Errors.MISSING_PHASE_1_NFT.selector);
        newManager.check(userNotValid2);

        vm.expectRevert(Errors.MISSING_PHASE_1_NFT.selector);
        newManager.check(userNotValid3);

        vm.expectRevert(Errors.MISSING_PHASE_1_NFT.selector);
        newManager.check(userValidPhaseThree);

        vm.expectRevert(Errors.MISSING_PHASE_1_NFT.selector);
        newManager.check(userValidPhaseTwo);

        newManager.isEligible(userValidPhaseOne).eq(true, "userValidPhaseOne");
        newManager.isEligible(userValidPhaseOne2).eq(true, "userValidPhaseOne2");
        newManager.isEligible(userValidPhaseOne3).eq(true, "userValidPhaseOne3");
        newManager.check(userValidPhaseOne);
        newManager.check(userValidPhaseOne2);
        newManager.check(userValidPhaseOne3);

        newManager.isEligible(acc1).eq(true, "acc1");
        newManager.isEligible(acc2).eq(true, "acc2");
        newManager.isEligible(acc3).eq(true, "acc3");
        newManager.check(acc1);
        newManager.check(acc2);
        newManager.check(acc3);
    }

    function testPhase0() external pranked(safe) {
        newManager.setPhase(0);
        newManager.phase().eq(0);

        newManager.isEligible(userNotValid).eq(true);
        newManager.isEligible(userNotValid2).eq(true);
        newManager.isEligible(userNotValid3).eq(true);
        newManager.check(userNotValid);
        newManager.check(userNotValid2);
        newManager.check(userNotValid3);

        newManager.isEligible(userValidPhaseThree).eq(true);
        newManager.isEligible(userValidPhaseTwo).eq(true);
        newManager.isEligible(userValidPhaseOne).eq(true);
        newManager.check(userValidPhaseOne);
        newManager.check(userValidPhaseOne2);
        newManager.check(userValidPhaseOne3);

        newManager.isEligible(acc1).eq(true, "acc1");
        newManager.isEligible(acc2).eq(true, "acc2");
        newManager.isEligible(acc3).eq(true, "acc3");
        newManager.check(acc1);
        newManager.check(acc2);
        newManager.check(acc3);
    }
}
