import hre from "hardhat";
import { withFixture, Role, wrapContractWithSigner } from "@utils/test";
import { expect } from "@test/chai";

describe("Diamond", () => {
    withFixture(["diamond-init"]);
    describe("#ownership", () => {
        it("sets correct owner", async function () {
            expect(await hre.Diamond.owner()).to.equal(hre.addr.deployer);
        });

        it("sets correct default admin role", async function () {
            expect(await hre.Diamond.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true);
        });

        it("sets a new pending owner", async function () {
            const pendingOwner = hre.users.userOne;
            await hre.Diamond.transferOwnership(pendingOwner.address);
            expect(await hre.Diamond.pendingOwner()).to.equal(pendingOwner.address);
        });
        it("sets the pending owner as new owner", async function () {
            const pendingOwner = hre.users.userOne;
            await hre.Diamond.transferOwnership(pendingOwner.address);
            await wrapContractWithSigner(hre.Diamond, pendingOwner).acceptOwnership();
            expect(await hre.Diamond.owner()).to.equal(pendingOwner.address);
        });
    });
});
