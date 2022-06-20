import { expect } from "chai";
import { withFixture, addCollateralAsset } from "@test-utils";
import { toBig } from "@utils/numbers";

describe("Minter", function () {
    withFixture("createMinter");

    describe("#user", () => {
        it("should be able to deposit collateral", async function () {
            const depositoor = this.users.userOne;
            const args = {
                name: "Collateral",
                price: 5,
                factor: 0.9,
                decimals: 18,
            };
            const [Collateral] = await addCollateralAsset(args);

            await Collateral.setVariable("_balances", {
                [depositoor.address]: toBig("1000000"),
            });

            await Collateral.setVariable("_allowances", {
                [depositoor.address]: {
                    [this.Diamond.address]: toBig("1000000"),
                },
            });

            await expect(
                this.Diamond.connect(depositoor).depositCollateral(
                    depositoor.address,
                    Collateral.address,
                    toBig("1000"),
                ),
            ).not.to.be.reverted;
        });
    });
});
