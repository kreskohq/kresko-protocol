import { expect } from "@test/chai";
import { defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { oneRay } from "@kreskolabs/lib/dist/numbers/wadray";
import { StabilityRateFacet } from "types/typechain/src/contracts/minter/facets/StabilityRateFacet";
import hre from "hardhat";

describe.only("Interest Rates", function () {
    withFixture(["minter-test", "interest-rate"]);
    let users: Users;
    beforeEach(async function () {
        users = await hre.getUsers();
        this.krAsset = this.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
        this.collateral = this.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);
    });
    describe("#stability-rate-accrual", async () => {
        it("calculates correct price rate", async function () {});
    });
});
