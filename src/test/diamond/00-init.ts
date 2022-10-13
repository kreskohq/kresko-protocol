import hre from "hardhat";
import { expect } from "@test/chai";
import { withFixture } from "@utils/test/fixtures";

describe.only("Diamond", function () {
    let users: Users;
    before(async function () {
        users = await hre.getUsers();
    });
    withFixture(["diamond-init"]);
    describe("#initialization", () => {
        it.only("sets correct state", async function () {
            console.log(this.users);
            expect(await hre.Diamond.owner()).to.equal(users.deployer.address);
            expect(await hre.Diamond.initialized()).to.equal(true);
        });

        it("sets standard facet addresses", async function () {
            const facetAddressesOnChain = (await hre.Diamond.facets()).map(f => f.facetAddress);
            const facetAddressesArtifact = this.facets.map(f => f.facetAddress);

            expect(facetAddressesOnChain.length).to.equal(facetAddressesArtifact.length);
            expect(facetAddressesOnChain).to.have.members(facetAddressesArtifact);
        });

        it("sets selectors of standard facets", async function () {
            const facetsSelectorsOnChain = (await hre.Diamond.facets()).flatMap(f => f.functionSelectors);
            const facetSelectorsOnArtifact = this.facets.flatMap(f => f.functionSelectors);

            expect(facetsSelectorsOnChain.length).to.equal(facetSelectorsOnArtifact.length);
            expect(facetsSelectorsOnChain).to.have.members(facetSelectorsOnArtifact);
        });
    });
});
