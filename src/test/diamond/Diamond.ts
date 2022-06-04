import hre from "hardhat";
import { constants } from "ethers";
import { Errors, fixtures, getUsers } from "./utils";
import { smock } from "@defi-wonderland/smock";
import chai, { expect } from "chai";

chai.use(smock.matchers);

import { SmockFacet__factory, SmockInit } from "types";
import { type FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";

describe.only("Diamond", function () {
    before(async function () {
        this.users = await getUsers();
    });
    describe("#initialization", function () {
        beforeEach(async function () {
            const fixture = await fixtures.diamondInit();

            this.users = fixture.users;
            this.addresses = {
                ZERO: constants.AddressZero,
                deployer: await this.users.deployer.getAddress(),
                userOne: await this.users.userOne.getAddress(),
                nonAdmin: await this.users.nonadmin.getAddress(),
            };

            this.Diamond = fixture.Diamond;
            this.facets = fixture.facets;
            this.DiamondDeployment = fixture.DiamondDeployment;
        });

        it("should deploy and initialize the diamond", async function () {
            expect(await this.Diamond.initialized()).to.equal(true);
        });

        it("should have same facets in the deployment artifact and on-chain", async function () {
            const facetAddressesOnChain = (await this.Diamond.facets()).map(f => f.facetAddress);
            const facetAddressesArtifact = this.facets.map(f => f.facetAddress);

            // // check addresses
            expect(facetAddressesOnChain.length).to.equal(facetAddressesArtifact.length);
            expect(facetAddressesOnChain).to.have.members(facetAddressesArtifact);
        });

        it("should have all function signatures for the standard facets", async function () {
            const facetsSelectorsOnChain = (await this.Diamond.facets()).flatMap(f => f.functionSelectors);
            const facetSelectorsOnArtifact = this.facets.flatMap(f => f.functionSelectors);

            expect(facetsSelectorsOnChain.length).to.equal(facetSelectorsOnArtifact.length);
            expect(facetsSelectorsOnChain).to.have.members(facetSelectorsOnArtifact);
        });

        describe("#ownership", function () {
            it("should set correct owner", async function () {
                expect(await this.Diamond.owner()).to.equal(this.addresses.deployer);
            });

            it("should set correct default admin", async function () {
                expect(
                    await this.Diamond.hasRole(
                        hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexlify(0), 32),
                        this.addresses.deployer,
                    ),
                ).to.equal(true);
            });
        });

        describe("#upgradeability", function () {
            it("should allow owner to add a new facet", async function () {
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

            it("should allow owner to remove a function", async function () {
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
                    Errors.DIAMOND_INVALID_FUNCTION_SIGNATURE,
                );
            });

            it("should allow owner to replace a function", async function () {
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
                    Errors.DIAMOND_INVALID_PENDING_OWNER,
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
                await expect(this.Diamond.connect(this.users.userOne).acceptOwnership()).to.not.be.reverted;
                const currentOwner = await this.Diamond.owner();
                expect(currentOwner).to.equal(correctOwner);
            });
        });
    });
});
