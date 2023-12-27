// solhint-disable state-visibility, max-states-count, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {Log, Help} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {IKrMulticall} from "periphery/IKrMulticall.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Kresko} from "kresko-lib/utils/Kresko.s.sol";
import {IAccess} from "kresko-lib/vendor/IAccess.sol";
import {Role} from "common/Constants.sol";
import {Vault} from "vault/Vault.sol";
import {IErrorsEvents} from "periphery/IErrorsEvents.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {IDiamondCutFacet, IExtendedDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {FacetCut, Initializer} from "diamond/DSTypes.sol";
import {CommonConfigFacet} from "common/facets/CommonConfigFacet.sol";
import {CommonInitArgs} from "common/Types.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {MinterConfigFacet} from "minter/facets/MinterConfigFacet.sol";
import {SCDPInitArgs} from "scdp/STypes.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {DeploymentFactory} from "factory/DeploymentFactory.sol";

contract InitializerTest {
    function initialize() public {
        // do nothing
    }
}

contract TestSnip is Tested, Deploy {
    using Log for *;
    using Help for *;
    using Deployed for *;
    using ShortAssert for *;

    Kresko kr;

    address payable krETH;
    address admin;

    KreskoAsset krETHAsset;

    function setUp() public {
        admin = Deploy.deployTest("MNEMONIC_DEVNET", "test-clean", 0).params.common.admin;
        krETH = payable(("krETH").addr());
        kr = kr.fromKISSFFI(address(kiss), rsPrices);
        krETHAsset = KreskoAsset(krETH);
    }

    function testFuzzAccessControl(address user) public {
        vm.assume(user != admin && user != address(0));
        prank(user);

        vm.deal(user, 1 ether);

        vm.expectRevert();
        IAccess(address(kresko)).transferOwnership(user);

        vm.expectRevert();
        IAccess(address(kresko)).acceptOwnership();

        vm.expectRevert();
        IDiamondCutFacet(address(kresko)).diamondCut(new FacetCut[](0), address(0), new bytes(0));

        Initializer[] memory initializers = new Initializer[](1);
        initializers[0] = Initializer(address(new InitializerTest()), "");

        vm.expectRevert();
        IExtendedDiamondCutFacet(address(kresko)).executeInitializers(initializers);

        vm.expectRevert();
        IExtendedDiamondCutFacet(address(kresko)).executeInitializer(initializers[0].initContract, initializers[0].initData);

        vm.expectRevert();
        IAccess(address(kresko)).grantRole(Role.DEFAULT_ADMIN, user);

        vm.expectRevert();
        IAccess(address(kresko)).revokeRole(Role.DEFAULT_ADMIN, admin);

        vm.expectRevert();
        vault.setGovernance(user);

        vm.expectRevert();
        vault.acceptGovernance();

        vm.expectRevert();
        krETHAsset.grantRole(Role.DEFAULT_ADMIN, user);

        vm.expectRevert();
        krETHAsset.revokeRole(Role.DEFAULT_ADMIN, admin);

        CommonInitArgs memory args;

        vm.expectRevert();
        CommonConfigFacet(address(kresko)).initializeCommon(args);

        MinterInitArgs memory minterArgs;

        vm.expectRevert();
        MinterConfigFacet(address(kresko)).initializeMinter(minterArgs);

        SCDPInitArgs memory scdpArgs;

        vm.expectRevert();
        SCDPConfigFacet(address(kresko)).initializeSCDP(scdpArgs);

        vm.expectRevert();
        CommonConfigFacet(address(kresko)).setFeeRecipient(user);

        vm.expectRevert();
        factory.setDeployer(user, true);

        vm.expectRevert();
        DeploymentFactory(address(factory)).transferOwnership(user);
    }
}
