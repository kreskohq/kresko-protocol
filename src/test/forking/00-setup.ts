import { expect } from "@test/chai";
import Role from "@utils/test/roles";
import hre from "hardhat";

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
});
