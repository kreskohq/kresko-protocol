import { expect } from "chai";
import { withFixture } from "@test-utils";

describe("Diamond", function () {
    withFixture("createBaseDiamond");
    describe("#initialization", () => {
        it("sets correct state", async function () {
            expect(await this.Diamond.owner()).to.equal(this.users.deployer.address);
            expect(await this.Diamond.initialized()).to.equal(true);
        });

        it("sets standard facet addresses", async function () {
            const facetAddressesOnChain = (await this.Diamond.facets()).map(f => f.facetAddress);
            const facetAddressesArtifact = this.facets.map(f => f.facetAddress);

            expect(facetAddressesOnChain.length).to.equal(facetAddressesArtifact.length);
            expect(facetAddressesOnChain).to.have.members(facetAddressesArtifact);
        });

        it("sets selectors of standard facets", async function () {
            const facetsSelectorsOnChain = (await this.Diamond.facets()).flatMap(f => f.functionSelectors);
            const facetSelectorsOnArtifact = this.facets.flatMap(f => f.functionSelectors);

            expect(facetsSelectorsOnChain.length).to.equal(facetSelectorsOnArtifact.length);
            expect(facetsSelectorsOnChain).to.have.members(facetSelectorsOnArtifact);
        });
    });
});
