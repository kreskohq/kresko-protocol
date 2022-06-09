import hre from "hardhat";
import { constants } from "ethers";
import { fixtures, getUsers } from "./utils";
import { smock } from "@defi-wonderland/smock";
import chai, { expect } from "chai";

chai.use(smock.matchers);

describe("Minter", function () {
    before(async function () {
        this.users = await getUsers();
    });
    describe("#initialization", function () {
        beforeEach(async function () {
            const fixture = await fixtures.minterInit();

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

        it("should initialize the diamond", async function () {
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
    });
});
