import hre from "hardhat";
import { expect } from "chai";
import { Error, withFixture } from "@test-utils";
import { smock } from "@defi-wonderland/smock";
import { FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";
import {
    SmockFacet__factory,
    SmockInit,
    SmockFacet,
    SmockFacet2,
    SmockInit__factory,
    SmockFacet2__factory,
} from "types";

describe("Diamond", function () {
    withFixture("createBaseDiamond");
    describe("#upgrades", () => {
        it("can add a new facet", async function () {
            const Factory = await smock.mock<SmockFacet__factory>("SmockFacet");
            const SmockFacet = await Factory.deploy();

            const [SmockInitializer] = await hre.deploy<SmockInit>("SmockInit");

            const signatures = hre.getSignatures(SmockFacet__factory.abi);

            const Cut: FacetCut = {
                facetAddress: SmockFacet.address,
                functionSelectors: signatures,
                action: FacetCutAction.Add,
            };

            const initData = await SmockInitializer.populateTransaction.initialize(this.addresses.userOne);

            await this.Diamond.diamondCut([Cut], initData.to, initData.data);

            const TEST_OPERATOR_ROLE = hre.ethers.utils.id("kresko.test.operator");
            const isTestOperator = await this.Diamond.hasRole(TEST_OPERATOR_ROLE, this.addresses.userOne);

            // Succesfully added the new operator through the initialization contract
            expect(isTestOperator).to.equal(true);

            const Facet = await hre.ethers.getContractAt(SmockFacet__factory.abi, this.Diamond.address);

            // Ensure facet has it's own storage
            const operatorFromNewStorage = await Facet.operator(); // Retrieved from SmockStorage
            expect(operatorFromNewStorage).to.equal(this.addresses.userOne);
        });

        it("can remove a function", async function () {
            // Delete acceptOwnership from DiamondOwnershipFacet

            // Check there is no pending owner
            let pendingOwner = await this.Diamond.pendingOwner();
            expect(pendingOwner).to.equal(this.addresses.ZERO);

            // Transfer to eg. wrong address
            const wrongOwner = this.addresses.nonAdmin;
            await this.Diamond.transferOwnership(wrongOwner);

            // Ensure
            pendingOwner = await this.Diamond.pendingOwner();
            expect(pendingOwner).to.equal(wrongOwner);

            // Fragment and signature for acceptOwnersip
            const functionFragment = this.Diamond.interface.functions["acceptOwnership()"];
            const signature = hre.ethers.utils.Interface.getSighash(functionFragment);

            const facetAddress = await this.Diamond.facetAddress(signature);
            const functions = await this.Diamond.facetFunctionSelectors(facetAddress);

            const Cut: FacetCut = {
                facetAddress: this.addresses.ZERO,
                action: FacetCutAction.Remove,
                functionSelectors: [signature],
            };

            // We will set a correct owner with delegatecall into the Diamond itself with the cut transaction
            const correctOwner = this.addresses.userOne;
            const initData = await this.Diamond.populateTransaction.transferOwnership(correctOwner);

            const tx = await this.Diamond.diamondCut([Cut], initData.to, initData.data);
            await tx.wait();

            // Ensure rest of the functions remain
            const functionsAfterCut = await this.Diamond.facetFunctionSelectors(facetAddress);
            expect(functionsAfterCut.length).to.equal(functions.length - 1);

            // Ensure delegatecall did set the correct pending owner with the cut
            const filter = this.Diamond.filters.PendingOwnershipTransfer(this.addresses.deployer, correctOwner);
            const [event] = await this.Diamond.queryFilter(filter);

            const { previousOwner, newOwner } = event.args;
            expect(previousOwner).to.equal(this.addresses.deployer);
            expect(newOwner).to.equal(correctOwner);

            // Ensure there is no function to accept the ownership
            await expect(this.Diamond.connect(this.users.nonadmin).acceptOwnership()).to.be.revertedWith(
                Error.DIAMOND_INVALID_FUNCTION_SIGNATURE,
            );
        });

        it("can replace a function", async function () {
            // Same as above but instead replace the function
            // Check there is no pending owner
            let pendingOwner = await this.Diamond.pendingOwner();
            expect(pendingOwner).to.equal(this.addresses.ZERO);

            // Transfer to eg. wrong address
            const wrongOwner = this.addresses.nonAdmin;
            await this.Diamond.transferOwnership(wrongOwner);

            // Ensure
            pendingOwner = await this.Diamond.pendingOwner();
            expect(pendingOwner).to.equal(wrongOwner);

            // Fragment and signature for acceptOwnersip
            const functionFragment = this.Diamond.interface.functions["acceptOwnership()"];
            const signature = hre.ethers.utils.Interface.getSighash(functionFragment);

            const OldOwnershipFacet = await this.Diamond.facetAddress(signature);

            const [NewOwnershipFacet, allOwnershipFacetSignatures] = await hre.deploy("DiamondOwnershipFacet2", {
                contract: "DiamondOwnershipFacet",
                from: this.addresses.deployer,
            });

            // Only replace a single function, we could replace all of them
            const Cut: FacetCut = {
                facetAddress: NewOwnershipFacet.address,
                action: FacetCutAction.Replace,
                functionSelectors: [signature],
            };

            // We will set a correct owner with delegatecall into the Diamond itself with the cut transaction
            const correctOwner = this.addresses.userOne;
            const initData = await this.Diamond.populateTransaction.transferOwnership(correctOwner);

            const tx = await this.Diamond.diamondCut([Cut], initData.to, initData.data);
            await tx.wait();

            // Ensure function exists and revert is for invalid address instead of missing function
            await expect(this.Diamond.connect(this.users.nonadmin).acceptOwnership()).to.be.revertedWith(
                Error.DIAMOND_INVALID_PENDING_OWNER,
            );

            // Ensure one function is contained in the new facet
            const functionsNewFacet = await this.Diamond.facetFunctionSelectors(NewOwnershipFacet.address);
            expect(functionsNewFacet.length).to.equal(1);
            expect(functionsNewFacet).to.have.members([signature]);

            // Ensure rest are in the previous one
            const functionsOldFacet = await this.Diamond.facetFunctionSelectors(OldOwnershipFacet);
            expect(functionsOldFacet).to.not.have.members([signature]);
            expect(functionsOldFacet.length).to.equal(allOwnershipFacetSignatures.length - 1);

            // Ensure correct owner can now accept the ownership
            expect(this.Diamond.connect(this.users.userOne).acceptOwnership());
            const currentOwner = await this.Diamond.owner();
            expect(currentOwner).to.equal(correctOwner);
        });

        it("can upgrade state", async function () {
            expect(await this.Diamond.initialized()).to.equal(true);

            const Factory = await smock.mock<SmockInit__factory>("SmockInit");
            const SmockInit = await Factory.deploy();

            const tx = await SmockInit.populateTransaction.upgradeState();

            await this.Diamond.upgradeState(tx.to, tx.data);
            expect(await this.Diamond.initialized()).to.equal(false);
        });

        it("can preserve old state when extending storage layout", async function () {
            expect(await this.Diamond.initialized()).to.equal(true);

            // Add the first facet
            const Factory = await smock.mock<SmockFacet__factory>("SmockFacet");
            const SmockFacet = await Factory.deploy();

            const [SmockInitializer] = await hre.deploy<SmockInit>("SmockInit");

            const signatures = hre.getSignatures(SmockFacet__factory.abi);

            const Cut: FacetCut = {
                facetAddress: SmockFacet.address,
                functionSelectors: signatures,
                action: FacetCutAction.Add,
            };

            const initData = await SmockInitializer.populateTransaction.initialize(this.addresses.userOne);
            await this.Diamond.diamondCut([Cut], initData.to, initData.data);

            const Diamond = await hre.ethers.getContractAt<SmockFacet>("SmockFacet", this.Diamond.address);
            const isInitialized = await Diamond.smockInitialized();
            expect(isInitialized).to.equal(true);

            // Add facet with extended state
            // Add the first facet
            const Factory2 = await smock.mock<SmockFacet2__factory>("SmockFacet2");
            const SmockFacet2 = await Factory2.deploy();

            const signatures2 = hre.getSignatures(SmockFacet2__factory.abi);

            const Cut2: FacetCut = {
                facetAddress: SmockFacet2.address,
                functionSelectors: signatures2,
                action: FacetCutAction.Add,
            };

            // Initializer only sets the new extended value, does not touch old storage
            const initData2 = await SmockFacet2.populateTransaction.initialize();
            await this.Diamond.diamondCut([Cut2], initData2.to, initData2.data);

            // Here we have appended the storage layout with the `extended` bool property.
            const DiamondExtended = await hre.ethers.getContractAt<SmockFacet2>("SmockFacet2", this.Diamond.address);

            const initializedAfterExtend = await DiamondExtended.getOldStructValueFromExtended();

            const extendedValue = await DiamondExtended.getNewStructValueFromExtended();

            // Old values remain
            expect(initializedAfterExtend).to.equal(true);
            // And we get new ones
            expect(extendedValue).to.equal(true);
        });
    });
});
