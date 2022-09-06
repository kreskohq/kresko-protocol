import { borrowKrAsset, depositMockCollateral, withFixture } from "@test-utils";
import { users } from "hardhat";

describe("Minter", function () {
    withFixture("minter-with-mocks");
    describe("#user", () => {
        beforeEach(function () {
            this.defaultDepositArgs = {
                user: users.userOne,
                asset: this.collaterals[0],
                amount: 10000,
            };

            this.defaultBorrowArgs = {
                user: users.userOne,
                asset: this.krAssets[0],
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
