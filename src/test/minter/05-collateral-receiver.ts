import { defaultCollateralArgs, defaultKrAssetArgs, Role, withFixture } from "@test-utils";
import hre from "hardhat";
import { fromBig, toBig, getInternalEvent } from "@kreskolabs/lib";
import { Error } from "@utils/test/errors";
import { addMockCollateralAsset, withdrawCollateral } from "@utils/test/helpers/collaterals";
import { expect } from "chai";
import { defaultOraclePrice, defaultDecimals } from "@utils/test/mocks";
import type { CollateralWithdrawnEventObject } from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";
import { BigNumber } from "ethers";

const uncheckedWithdraw = async (self: any) => {};
describe("CollateralReceiver - UncheckedCollateralWithdraw", () => {
    withFixture(["minter-test"]);

    beforeEach(async function () {
        const collateralArgs = {
            name: "SecondCollateral",
            price: defaultOraclePrice, // $10
            factor: 1,
            decimals: defaultDecimals,
        };
        const { mocks } = await addMockCollateralAsset(collateralArgs);

        await mocks!.contract.setVariable("_balances", {
            [hre.users.userOne.address]: this.initialBalance,
        });
        await mocks!.contract.setVariable("_allowances", {
            [hre.users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });

        this.collateral = this.collaterals!.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        this.initialBalance = toBig(100000);

        await this.collateral.mocks!.contract.setVariable("_balances", {
            [hre.users.userOne.address]: this.initialBalance,
        });
        await this.collateral.mocks!.contract.setVariable("_allowances", {
            [hre.users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        expect(await this.collateral.contract.balanceOf(hre.users.userOne.address)).to.equal(this.initialBalance);

        this.depositArgs = {
            user: hre.users.userOne,
            asset: this.collateral,
            amount: toBig(10000),
        };
    });

    describe("#collateral", () => {
        describe("#unchecked-withdraw", () => {
            describe("when the account's minimum collateral value is 0", function () {
                it("should allow an account to withdraw their entire deposit", async function () {
                    const depositedCollateralAssets = await hre.Diamond.getDepositedCollateralAssets(
                        hre.users.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

                    await hre.Diamond.connect(hre.users.userOne).withdrawCollateral(
                        hre.users.userOne.address,
                        this.collateral.address,
                        this.depositAmount,
                        0,
                    );
                });
            });
        });
    });
});
