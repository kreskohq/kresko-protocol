import { addMockCollateralAsset, defaultDecimals, defaultOraclePrice, withFixture } from "@test-utils";
import { extractInternalIndexedEventFromTxReceipt } from "@utils";
import { fromBig, toBig } from "@utils/numbers";
import { Error } from "@utils/test/errors";
import { expect } from "chai";
import hre, { users } from "hardhat";
import { MinterEvent__factory } from "types";
import { CollateralDepositedEventObject } from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

describe("Minter", function () {
    withFixture("minter-with-mocks");
    beforeEach(async function () {
        this.collateral = this.collaterals[0];
        this.initialBalance = toBig(100000);
        await this.collateral.mocks.contract.setVariable("_balances", {
            [users.userOne.address]: this.initialBalance,
        });
        await this.collateral.mocks.contract.setVariable("_allowances", {
            [users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });

        expect(await this.collateral.contract.balanceOf(users.userOne.address)).to.equal(this.initialBalance);

        this.depositArgs = {
            user: users.userOne,
            asset: this.collateral,
            amount: toBig(10000),
        };
    });

    describe("#collateral", () => {
        describe("#deposit", () => {
            it("should allow an account to deposit whitelisted collateral", async function () {
                // Account has no deposited assets
                const depositedCollateralAssetsBefore = await hre.Diamond.getDepositedCollateralAssets(
                    this.depositArgs.user.address,
                );
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                // Deposit collateral
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Account now has deposited assets
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.depositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address]);
                // Account's collateral deposit balances have increased
                expect(
                    await hre.Diamond.collateralDeposits(this.depositArgs.user.address, this.collateral.address),
                ).to.equal(this.depositArgs.amount);
                // Kresko contract's collateral balance has increased
                expect(await this.collateral.contract.balanceOf(hre.Diamond.address)).to.equal(this.depositArgs.amount);
                // Account's collateral balance has decreased
                expect(fromBig(await this.collateral.contract.balanceOf(users.userOne.address))).to.equal(
                    fromBig(this.initialBalance) - fromBig(this.depositArgs.amount),
                );
            });

            it("should allow an arbitrary account to deposit whitelisted collateral on behalf of another account", async function () {
                // Load arbitrary user with sufficient collateral for testing purposes
                const arbitraryUser = users.userThree;
                await this.depositArgs.asset.mocks.contract.setVariable("_balances", {
                    [arbitraryUser.address]: this.initialBalance,
                });
                await this.depositArgs.asset.mocks.contract.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });

                // Initially, the array of the user's deposited collateral assets should be empty.
                const depositedCollateralAssetsBefore = await hre.Diamond.getDepositedCollateralAssets(
                    this.depositArgs.user.address,
                );
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                // Deposit collateral
                await expect(
                    hre.Diamond.connect(users.userThree).depositCollateral(
                        this.depositArgs.user.address,
                        this.depositArgs.asset.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets has been pushed to.
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.depositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.depositArgs.asset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await hre.Diamond.collateralDeposits(
                    this.depositArgs.user.address,
                    this.depositArgs.asset.address,
                );
                expect(amountDeposited).to.equal(this.depositArgs.amount);

                // Confirm the amount as been transferred from the user into Kresko.sol
                const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                expect(kreskoBalance).to.equal(this.depositArgs.amount);

                // Confirm the depositor's (arbitraryUser) wallet balance has been adjusted accordingly
                const depositorBalanceAfter = await this.collateral.contract.balanceOf(arbitraryUser.address);
                expect(fromBig(depositorBalanceAfter)).to.equal(
                    fromBig(this.initialBalance) - fromBig(this.depositArgs.amount),
                );
            });

            it("should allow an account to deposit more collateral to an existing deposit", async function () {
                // Deposit first batch of collateral
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Deposit second batch of collateral
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.depositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await hre.Diamond.collateralDeposits(
                    this.depositArgs.user.address,
                    this.collateral.address,
                );
                expect(amountDeposited).to.equal(this.depositArgs.amount.add(this.depositArgs.amount));
            });

            it("should allow an account to have deposited multiple collateral assets", async function () {
                // Load user account with a different type of collateral
                const collateralArgs = {
                    name: "SecondCollateral",
                    price: defaultOraclePrice, // $10
                    factor: 1,
                    decimals: defaultDecimals,
                };
                const { contract, mocks } = await addMockCollateralAsset(collateralArgs);

                await mocks.contract.setVariable("_balances", {
                    [users.userOne.address]: this.initialBalance,
                });
                await mocks.contract.setVariable("_allowances", {
                    [users.userOne.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });

                // Deposit batch of first collateral type
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.depositArgs.asset.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Deposit batch of second collateral type
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        contract.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets contains both collateral assets
                const depositedCollateralAssetsAfter = await hre.Diamond.getDepositedCollateralAssets(
                    this.depositArgs.user.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address, contract.address]);
            });

            it("should emit CollateralDeposited event", async function () {
                const tx = await hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                    this.depositArgs.user.address,
                    this.depositArgs.asset.address,
                    this.depositArgs.amount,
                );
                const event = await extractInternalIndexedEventFromTxReceipt<CollateralDepositedEventObject>(
                    tx,
                    MinterEvent__factory.connect(hre.Diamond.address, this.depositArgs.user),
                    "CollateralDeposited",
                );
                expect(event.account).to.equal(this.depositArgs.user.address);
                expect(event.collateralAsset).to.equal(this.depositArgs.asset.address);
                expect(event.amount).to.equal(this.depositArgs.amount);
            });

            it("should revert if depositing collateral that has not been whitelisted", async function () {
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        "0x0000000000000000000000000000000000000001",
                        this.depositArgs.amount,
                    ),
                ).to.be.revertedWith(Error.COLLATERAL_DOESNT_EXIST);
            });

            it("should revert if depositing an amount of 0", async function () {
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.depositArgs.asset.address,
                        0,
                    ),
                ).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
        });

        describe("#withdraw", () => {
            // TODO: migrate old collateral withdraw tests
        });
    });
});
