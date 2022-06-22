import { withFixture } from "@test-utils";
import { expect } from "chai";
import Role from "../utils/roles";

describe("Diamond", function () {
    withFixture("createBaseDiamond");
    describe("#ownership", () => {
        it("sets correct owner", async function () {
            expect(await this.Diamond.owner()).to.equal(this.addresses.deployer);
        });

        it("sets correct default admin role", async function () {
            expect(await this.Diamond.hasRole(Role.ADMIN, this.addresses.deployer)).to.equal(true);
        });

        it("sets a new pending owner", async function () {
            const pendingOwner = this.users.userOne;
            await this.Diamond.transferOwnership(pendingOwner.address);
            expect(await this.Diamond.pendingOwner()).to.equal(pendingOwner.address);
        });
        it("sets the pending owner as new owner", async function () {
            const pendingOwner = this.users.userOne;
            await this.Diamond.transferOwnership(pendingOwner.address);
            await this.Diamond.connect(pendingOwner).acceptOwnership();
            expect(await this.Diamond.owner()).to.equal(pendingOwner.address);
        });
    });
});
