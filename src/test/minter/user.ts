import { users } from "hardhat";
import { withFixture, depositMockCollateral, borrowKrAsset } from "@test-utils";

describe("Minter", function () {
    withFixture("createMinterUser");
    beforeEach(async function () {
        const [defaultCollateral] = this.collaterals[0];

        this.defaultDepositArgs = {
            user: users.userOne,
            asset: defaultCollateral,
            amount: 10000,
        };

        const [defaultKrAsset] = this.krAssets[0];

        this.defaultBorrowArgs = {
            user: users.userOne,
            asset: defaultKrAsset,
            amount: 100,
        };
    });

    describe("#user", () => {
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
