import { oneRay } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import hre from "hardhat";

describe.only("Shared Debt", () => {
    withFixture(["minter-test"]);
    beforeEach(function () {
        this.krAsset = this.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;
        this.collateral = this.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
    });
    describe("#init", () => {
        it("runs", async function () {
            const config = await hre.Diamond.getStabilityRateConfigurationForAsset(this.krAsset.address);

            // default values
            expect(config.debtIndex).to.bignumber.equal(oneRay);
            expect(config.stabilityRate).to.bignumber.equal(oneRay);
        });
    });
});
