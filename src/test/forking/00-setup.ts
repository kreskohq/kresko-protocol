import { minterFacets } from "@deploy-config/shared";
import { updateFacets } from "@scripts/update-facets";
import { expect } from "@test/chai";
import Role from "@utils/test/roles";
import hre, { toBig } from "hardhat";

(process.env.FORKING ? describe : describe.skip)("Forking", () => {
    describe("#setup", () => {
        it("should get Kresko from the companion network locally", async function () {
            expect(hre.companionNetworks).to.have.property("live");

            const Kresko = await hre.getContractOrFork("Kresko");
            expect(await Kresko.initialized()).to.equal(true);

            const Safe = await hre.getContractOrFork("GnosisSafeL2", "Multisig");
            expect(await Kresko.hasRole(Role.DEFAULT_ADMIN, Safe.address)).to.be.true;
        });
    });
    describe("#rate-upgrade-11-04-2023", () => {
        it("should be able to deploy facets", async function () {
            expect(hre.companionNetworks).to.have.property("live");
            const { deployer } = await hre.getNamedAccounts();
            const Kresko = await hre.getContractOrFork("Kresko");
            const krETH = await hre.getContractOrFork("KreskoAsset", "krETH");

            const stabilityRateBefore = await Kresko.getStabilityRateForAsset(krETH.address);
            const priceRateBefore = await Kresko.getPriceRateForAsset(krETH.address);

            expect(stabilityRateBefore).to.be.gt(0);
            expect(priceRateBefore).to.be.gt(0);

            const facetsBefore = await Kresko.facets();
            const { facetsAfter } = await updateFacets({ facetNames: minterFacets });
            expect(facetsAfter).to.not.deep.equal(facetsBefore);

            const stabilityRateAfter = await Kresko.getStabilityRateForAsset(krETH.address);
            const priceRateAfter = await Kresko.getPriceRateForAsset(krETH.address);

            expect(stabilityRateAfter).to.be.gt(0);

            expect(priceRateAfter).to.equal(priceRateBefore);
            expect(stabilityRateAfter).to.equal(stabilityRateBefore);

            await expect(Kresko.batchRepayFullStabilityRateInterest(deployer)).to.not.be.reverted;
            await expect(Kresko.mintKreskoAsset(deployer, krETH.address, toBig(0.1))).to.not.be.reverted;
        });
    });
});
