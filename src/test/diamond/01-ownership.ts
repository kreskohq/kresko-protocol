import hre from "hardhat";
import { withFixture, Role } from "@utils/test";
import { expect } from "@test/chai";

describe("Diamond", function () {
    let addr: Addresses;
    let users: Users;
    before(async function () {
        addr = await hre.getAddresses();
        users = await hre.getUsers();
    });
    withFixture(["diamond-init"]);
    describe("#ownership", () => {
        it("sets correct owner", async function () {
            expect(await hre.Diamond.owner()).to.equal(addr.deployer);
        });

        it("sets correct default admin role", async function () {
            expect(await hre.Diamond.hasRole(Role.ADMIN, addr.deployer)).to.equal(true);
        });

        it("sets a new pending owner", async function () {
            const pendingOwner = users.userOne;
            await hre.Diamond.transferOwnership(pendingOwner.address);
            expect(await hre.Diamond.pendingOwner()).to.equal(pendingOwner.address);
        });
        it("sets the pending owner as new owner", async function () {
            const pendingOwner = users.userOne;
            await hre.Diamond.transferOwnership(pendingOwner.address);
            await hre.Diamond.connect(pendingOwner).acceptOwnership();
            expect(await hre.Diamond.owner()).to.equal(pendingOwner.address);
        });
    });
});
