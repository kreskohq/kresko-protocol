import { withFixture, depositMockCollateral, borrowKrAsset } from "@test-utils";

describe("Minter", function () {
    withFixture("createMinterUser");

    describe("#user", () => {
        beforeEach(async function () {
            this.defaultCollateralArgs = {
                name: "Collateral",
                price: 5,
                factor: 0.9,
                decimals: 18,
            };
            const [defaultCollateral] = this.collaterals[0];

            this.defaultDepositArgs = {
                user: this.users.userOne,
                asset: defaultCollateral,
                amount: 10000,
            };

            const [defaultKrAsset] = this.krAssets[0];

            this.defaultBorrowArgs = {
                user: this.users.userOne,
                asset: defaultKrAsset,
                amount: 100,
            };
        });
        describe("#collateral", () => {
            it("can deposit collateral", async function () {
                await depositMockCollateral(this.defaultDepositArgs);
            });
        });

        describe("#krAsset", () => {
            it("can borrow krAssets", async function () {
                await depositMockCollateral(this.defaultDepositArgs);
                await borrowKrAsset(this.defaultBorrowArgs);
            });
        });
    });
});
