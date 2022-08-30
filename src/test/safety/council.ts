import hre from "hardhat";
import { expect } from "@test/chai";

import {
    withFixture,
} from "@utils/test";

describe("Council", function () {
    let users: Users;
    let addr: Addresses;
    withFixture("createMinter");
    beforeEach(async function () {
        users = hre.users;
        addr = hre.addr;

        // TODO: deploy council as multisig contract
        
    });
    describe("#toggleAssetsPaused", () => {
        it("can toggle different asset functionality to be paused", async function () {
          // TODO: 
        });

    });
});
