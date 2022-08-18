import hre, { users } from "hardhat";
import {
    withFixture,
    defaultDecimals,
    defaultOraclePrice,
    addMockCollateralAsset,
} from "@test-utils";
import { Error } from "@utils/test/errors"
import { expect } from "chai";
import { toBig, fromBig } from "@utils/numbers";

describe("Minter", function () {
    withFixture("createMinterUser");
    beforeEach(async function () {
        const collateralArgs = {
            name: "Collateral",
            price: defaultOraclePrice, // $10
            factor: 1,
            decimals: defaultDecimals,
        };
        const [Collateral] = await addMockCollateralAsset(collateralArgs);

        this.initialBalance = toBig(100000);
        await Collateral.setVariable("_balances", {
            [users.userOne.address]: this.initialBalance,
        });
        await Collateral.setVariable("_allowances", {
            [users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        expect(await Collateral.balanceOf(users.userOne.address)).to.equal(this.initialBalance);

        this.despositArgs = {
            user: users.userOne,
            asset: Collateral,
            amount: toBig(10000),
        };
    });

    describe("#collateral", () => {
        describe("#deposit", () => {
            it("should allow an account to deposit whitelisted collateral", async function () {
                // Account has no deposited assets
                const depositedCollateralAssetsBefore = await hre.Diamond.getDepositedCollateralAssets(
                    this.despositArgs.user.address,
                );
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                // Deposit collateral
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                // Account now has deposited assets
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.despositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.despositArgs.asset.address]);
                // Account's collateral deposit balances have increased
                expect(await hre.Diamond.collateralDeposits(this.despositArgs.user.address, this.despositArgs.asset.address)).to.equal(this.despositArgs.amount);
                // Kresko contract's collateral balance has increased
                expect(await this.despositArgs.asset.balanceOf(hre.Diamond.address)).to.equal(this.despositArgs.amount);
                // Account's collateral balance has decreased
                expect(fromBig(await this.despositArgs.asset.balanceOf(users.userOne.address))).to.equal(
                    fromBig(this.initialBalance) - fromBig(this.despositArgs.amount)
                );
            });

            it("should allow an arbitrary account to deposit whitelisted collateral on behalf of another account", async function () {
                // Load arbitrary user with sufficient collateral for testing purposes
                const arbitraryUser = users.userThree;
                await this.despositArgs.asset.setVariable("_balances", {
                    [arbitraryUser.address]: this.initialBalance,
                });
                await this.despositArgs.asset.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });

                // Initially, the array of the user's deposited collateral assets should be empty.
                const depositedCollateralAssetsBefore = await hre.Diamond.getDepositedCollateralAssets(
                    this.despositArgs.user.address,
                );
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                 // Deposit collateral
                 await expect(hre.Diamond.connect(users.userThree).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets has been pushed to.
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.despositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.despositArgs.asset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await hre.Diamond.collateralDeposits(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                );
                expect(amountDeposited).to.equal(this.despositArgs.amount);

                // Confirm the amount as been transferred from the user into Kresko.sol
                const kreskoBalance = await this.despositArgs.asset.balanceOf(hre.Diamond.address);
                expect(kreskoBalance).to.equal(this.despositArgs.amount);

                // Confirm the depositor's (arbitraryUser) wallet balance has been adjusted accordingly
                const depositorBalanceAfter = await this.despositArgs.asset.balanceOf(arbitraryUser.address);
                expect(fromBig(depositorBalanceAfter)).to.equal(
                    fromBig(this.initialBalance) - fromBig(this.despositArgs.amount)
                );
            });

            it("should allow an account to deposit more collateral to an existing deposit", async function () {
                // Deposit first batch of collateral
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                  // Deposit second batch of collateral
                  await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.despositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.despositArgs.asset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await hre.Diamond.collateralDeposits(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                );
                expect(amountDeposited).to.equal(this.despositArgs.amount.add(this.despositArgs.amount));
            });

            it("should allow an account to have deposited multiple collateral assets", async function () {
                // Load user account with a different type of collateral
                const collateralArgs = {
                    name: "SecondCollateral",
                    price: defaultOraclePrice, // $10
                    factor: 1,
                    decimals: defaultDecimals,
                };
                const [SecondCollateral] = await addMockCollateralAsset(collateralArgs);
        
                await SecondCollateral.setVariable("_balances", {
                    [users.userOne.address]: this.initialBalance,
                });
                await SecondCollateral.setVariable("_allowances", {
                    [users.userOne.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });

                // Deposit batch of first collateral type
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                // Deposit batch of second collateral type
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    SecondCollateral.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets contains both collateral assets
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.despositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([
                    this.despositArgs.asset.address,
                    SecondCollateral.address,
                ]);
            });

            // it("should emit CollateralDeposited event", async function () {
            //     const receipt = await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
            //         this.despositArgs.user.address,
            //         this.despositArgs.asset.address,
            //         this.despositArgs.amount
            //     )).not.to.be.reverted;

            //     const { args } = await extractEventFromTxReceipt(receipt, "CollateralDeposited");
            //     expect(args.account).to.equal(this.despositArgs.user.address);
            //     expect(args.collateralAsset).to.equal(this.despositArgs.asset.address);
            //     expect(args.amount).to.equal(this.despositArgs.amount);
            // });

            it("should revert if depositing collateral that has not been whitelisted", async function () {
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    "0x0000000000000000000000000000000000000001",
                    this.despositArgs.amount
                )).to.be.revertedWith(Error.COLLATERAL_DOESNT_EXIST);
            });

            it("should revert if depositing an amount of 0", async function () {
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    0,
                )).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
        });

        describe("#withdraw", () => {
            // TODO: migrate old collateral withdraw tests
        });

    });
});
