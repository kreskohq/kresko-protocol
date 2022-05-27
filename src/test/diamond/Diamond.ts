import hre from "hardhat";
import { constants } from "ethers";
import { extractEventFromTxReceipt } from "@utils";
import { Errors, fixtures, getUsers } from "./utils";
import { expect } from "chai";
import { type FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";
import { type DiamondOwnershipFacet, DiamondOwnershipFacet__factory } from "types";
import type { DiamondCutEvent } from "types/typechain/DiamondCutFacet";

describe.only("Diamond", function () {
    before(async function () {
        this.users = await getUsers();
    });
    describe("#initialization", function () {
        beforeEach(async function () {
            const { contracts, users, fixture } = await fixtures.diamondInit();
            this.fixture = fixture;
            this.users = users;
            this.addresses = {
                ZERO: constants.AddressZero,
                deployer: await this.users.deployer.getAddress(),
            };

            this.Diamond = contracts.Diamond;
            this.facets = contracts.facets;
        });

        it("should deploy and initialize the diamond", async function () {
            expect(await this.Diamond.initialized()).to.equal(true);
        });

        it("should set correct owner", async function () {
            expect(await this.Diamond.owner()).to.equal(this.addresses.deployer);
        });

        it("should have standard facets in the facets-array", async function () {
            const deployedFacets = this.fixture.Diamond.facets;
            expect(deployedFacets.length).to.equal(3);

            const facetAddresses = deployedFacets.map(d => d.facetAddress);

            const diamondFacetAddresses = await this.Diamond.facetAddresses();

            // check addresses
            expect(diamondFacetAddresses.length).to.equal(facetAddresses.length);
            expect(diamondFacetAddresses).to.have.members(facetAddresses);
        });

        it("should have all function signatures for the standard facets", async function () {
            const DiamondCutFacet = this.facets.find(f => f.name === "DiamondCutFacet");
            const DiamondLoupeFacet = this.facets.find(f => f.name === "DiamondLoupeFacet");
            const DiamondOwnershipFacet = this.facets.find(f => f.name === "DiamondOwnershipFacet");

            const DiamondCutSelectors = await this.Diamond.facetFunctionSelectors(DiamondCutFacet.contract.address);
            const DiamondLoupeFacetSelectors = await this.Diamond.facetFunctionSelectors(
                DiamondLoupeFacet.contract.address,
            );
            const DiamondOwnershipFacetSelectors = await this.Diamond.facetFunctionSelectors(
                DiamondOwnershipFacet.contract.address,
            );

            expect(DiamondCutSelectors).to.have.members(DiamondCutFacet.signatures);
            expect(DiamondLoupeFacetSelectors).to.have.members(DiamondLoupeFacet.signatures);
            expect(DiamondOwnershipFacetSelectors).to.have.members(DiamondOwnershipFacet.signatures);
        });

        it("should allow owner to remove a function from a facet", async function () {
            const DiamondOwnershipFacet = this.facets.find(f => f.name === "DiamondOwnershipFacet")
                .contract as DiamondOwnershipFacet;

            // Remove the pendingOwner view function from the Ownership facet
            const pendingOwner = await this.Diamond.pendingOwner();
            expect(pendingOwner).to.equal(this.addresses.ZERO);

            // Get all _function_ signatures and their readable names
            const signaturesWithNames = hre.getSignaturesWithNames(DiamondOwnershipFacet__factory.abi);

            // Function to remove
            const pendingOwnerFuncFragment = DiamondOwnershipFacet.interface.functions["pendingOwner()"];

            // Save the desired result for later comparison
            const functionsToKeep = signaturesWithNames
                .filter(s => s.name !== pendingOwnerFuncFragment.name)
                .map(s => s.sig);

            const functionsToRemove = signaturesWithNames
                .filter(s => s.name === pendingOwnerFuncFragment.name)
                .map(f => f.sig);

            expect(functionsToKeep.length).to.equal(signaturesWithNames.length - 1);
            expect(functionsToRemove.length).to.equal(1);

            // Single cut
            const DiamondCuts: FacetCut[] = [
                {
                    facetAddress: this.addresses.ZERO,
                    action: FacetCutAction.Remove,
                    functionSelectors: functionsToRemove,
                },
            ];

            // Do not initialize anything with this test scope
            const initializer: DiamondCutInitializer = [this.addresses.ZERO, "0x"];

            // Perform
            const tx = await this.Diamond.diamondCut(DiamondCuts, ...initializer);
            const receipt = await extractEventFromTxReceipt<DiamondCutEvent>(tx, "DiamondCut");

            // Validate event
            const { _diamondCut, _init, _calldata } = receipt.args;
            expect(_diamondCut.length).to.equal(DiamondCuts.length);
            /// IDiamondCut.sol - Add=0, Replace=1, Remove=2
            expect(_diamondCut[0].action).to.equal(2);
            expect(_init).to.equal(initializer[0]);
            expect(_calldata).to.equal(initializer[1]);

            // Validate existence
            await expect(this.Diamond.pendingOwner()).to.be.revertedWith(Errors.INVALID_FUNCTION_SIGNATURE);

            const facetFunctionsAfterCut = await this.Diamond.facetFunctionSelectors(DiamondOwnershipFacet.address);

            expect(facetFunctionsAfterCut).to.have.members(functionsToKeep);
        });
    });
});
