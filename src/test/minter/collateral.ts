import hre, { users } from "hardhat";
import {
    Action,
    Role,
    withFixture,
    defaultDecimals,
    defaultOraclePrice,
    defaultCloseFee,
    addMockCollateralAsset,
    addMockKreskoAsset,
} from "@test-utils";
import { Error } from "@utils/test/errors"
import { expect } from "chai";
import { toBig, fromBig } from "@utils/numbers";

describe("Minter", function () {
    withFixture("createMinterUser");
    beforeEach(async function () {
        const collateralArgs = {
            name: "Collateral003",
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

            it("should revert if collateral is not depositable", async function () {
                // Grant userThree the SAFETY_COUNCIL role            
                await hre.Diamond.connect(users.deployer).grantRole(Role.SAFETY_COUNCIL, users.userThree.address);
                expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, users.userThree.address)).to.equal(true);

                await hre.Diamond.toggleAssetsPaused(
                    [this.collateral.address],
                    Action.DEPOSIT,
                    true,
                    0,
                );
                const isDepositPaused = await hre.Diamond.assetActionPaused(this.collateral.address, Action.DEPOSIT.toString());
                expect(isDepositPaused).to.equal(true);

                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    0,
                )).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
        });

        describe("#withdrawCollateral", () => {
            beforeEach(async function () {
                // Deposit collateral
                await expect(hre.Diamond.connect(this.despositArgs.user).depositCollateral(
                    this.despositArgs.user.address,
                    this.despositArgs.asset.address,
                    this.despositArgs.amount
                )).not.to.be.reverted;

                this.collateral = this.despositArgs.asset;
                this.depositAmount = this.despositArgs.amount;
            });

            describe("when the account's minimum collateral value is 0", function () {
                it("should allow an account to withdraw their entire deposit", async function () {
                    const depositedCollateralAssets = await hre.Diamond.getDepositedCollateralAssets(
                        users.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([
                        this.collateral.address
                    ]);

                    await hre.Diamond.connect(users.userOne).withdrawCollateral(
                        users.userOne.address,
                        this.collateral.address,
                        this.depositAmount,
                        0,
                    );

                    // Ensure that the collateral asset is removed from the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssetsPostWithdraw = await hre.Diamond.getDepositedCollateralAssets(
                        users.userOne.address,
                    );
                    expect(depositedCollateralAssetsPostWithdraw).to.deep.equal([]);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await hre.Diamond.collateralDeposits(
                        users.userOne.address,
                        this.collateral.address,
                    );
                    expect(amountDeposited).to.equal(0);

                    // Ensure the amount transferred is correct
                    const kreskoBalance = await this.collateral.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(0);
                    const userOneBalance = await this.collateral.balanceOf(users.userOne.address);
                    expect(userOneBalance).to.equal(this.initialBalance);
                });

                it("should allow an account to withdraw a portion of their deposit", async function () {
                    const withdrawAmount = this.depositAmount.div(2);

                    await hre.Diamond.connect(users.userOne).withdrawCollateral(
                        users.userOne.address,
                        this.collateral.address,
                        withdrawAmount,
                        0, // The index of this.collateral.address in the account's depositedCollateralAssets
                    );

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await hre.Diamond.collateralDeposits(
                        users.userOne.address,
                        this.collateral.address,
                    );
                    expect(amountDeposited).to.equal(this.depositAmount.sub(withdrawAmount));

                    // Ensure that the collateral asset is still in the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await hre.Diamond.getDepositedCollateralAssets(
                        users.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([
                        this.collateral.address
                    ]);

                    const kreskoBalance = await this.collateral.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(this.depositAmount.sub(withdrawAmount));
                    const userOneBalance = await this.collateral.balanceOf(users.userOne.address);
                    expect(userOneBalance).to.equal(this.initialBalance.sub(amountDeposited));
                });

                it("should allow trusted address to withdraw another accounts deposit", async function () {
                    // Grant userThree the MANAGER role            
                    await hre.Diamond.connect(users.deployer).grantRole(Role.MANAGER, users.userThree.address);
                    expect(await hre.Diamond.hasRole(Role.MANAGER, users.userThree.address)).to.equal(true);

                    const collateralBefore = await hre.Diamond.collateralDeposits(
                        users.userOne.address,
                        this.collateral.address,
                    );

                    await expect(
                        hre.Diamond.connect(users.userThree).withdrawCollateral(
                            users.userOne.address,
                            this.collateral.address,
                            this.depositAmount,
                            0,
                        ),
                    ).to.not.be.reverted;

                    const collateralAfter = await hre.Diamond.collateralDeposits(
                        users.userOne.address,
                        this.collateral.address,
                    );
                    // Ensure that collateral was withdrawn
                    expect(collateralAfter).to.equal(collateralBefore.sub(this.depositAmount));
                });

                // it("should emit CollateralWithdrawn event", async function () {
                //     const receipt = await hre.Diamond.connect(users.userOne).withdrawCollateral(
                //         users.userOne.address,
                //         collateralAsset.address,
                //         this.depositAmount,
                //         0,
                //     );

                //     const { args } = await extractEventFromTxReceipt(receipt, "CollateralWithdrawn");
                //     expect(args.account).to.equal(users.userOne.address);
                //     expect(args.collateralAsset).to.equal(collateralAsset.address);
                //     expect(args.amount).to.equal(amountToWithdraw);
                // });

                it("should not allow untrusted address to withdraw another accounts deposit", async function () {
                    await expect(
                        hre.Diamond.connect(users.userThree).withdrawCollateral(
                            users.userOne.address,
                            this.collateral.address,
                            this.initialBalance,
                            0,
                        ),
                    ).to.be.revertedWith(
                        `AccessControl: account ${users.userThree.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                    );
                });
            });

            describe("when the account's minimum collateral value is > 0", function () {
                beforeEach(async function () {
                    // Add mock krAsset to protocol
                    const krAssetArgs = {
                        name: "KreskoAsset",
                        price: defaultOraclePrice, // $10
                        factor: 1,
                        supplyLimit: 10000,
                        closeFee: defaultCloseFee
                    }
                    const [KreskoAsset] = await addMockKreskoAsset(krAssetArgs);
                    this.krAsset = KreskoAsset;

                    // userOne mints some kr assets
                    this.mintAmount = toBig(100)
                    await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        this.mintAmount,
                    );

                    this.mcr = await hre.Diamond.minimumCollateralizationRatio();
                });

                it("should allow an account to withdraw their deposit if it does not violate the health factor", async function () {
                    const withdrawAmount = toBig(10);

                    // Ensure that the withdrawal would not put the account's collateral value
                    // less than the account's minimum collateral value:
                    const accountMinCollateralValue = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                        users.userOne.address,
                        this.mcr,
                    );
                    const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(
                        users.userOne.address,
                    );
                    const [withdrawnCollateralValue] = await hre.Diamond.getCollateralValueAndOraclePrice(
                        this.collateral.address,
                        withdrawAmount,
                        false,
                    );
                    expect(
                        accountCollateralValue.rawValue
                            .sub(withdrawnCollateralValue.rawValue)
                            .gte(accountMinCollateralValue.rawValue),
                    ).to.be.true;

                    await hre.Diamond.connect(users.userOne).withdrawCollateral(
                        users.userOne.address,
                        this.collateral.address,
                        withdrawAmount,
                        0,
                    );
                    // Ensure that the collateral asset is still in the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await hre.Diamond.getDepositedCollateralAssets(
                        users.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([
                        this.collateral.address
                    ]);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await hre.Diamond.collateralDeposits(
                        users.userOne.address,
                        this.collateral.address,
                    );
                    expect(amountDeposited).to.equal(this.depositAmount.sub(withdrawAmount));

                    // Check the balances of the contract and user
                    const kreskoBalance = await this.collateral.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(this.depositAmount.sub(withdrawAmount));
                    const userOneBalance = await this.collateral.balanceOf(users.userOne.address);
                    expect(userOneBalance).to.equal(this.initialBalance.sub((this.depositAmount.sub(withdrawAmount))));

                    // Ensure the account's minimum collateral value is <= the account collateral value
                    // These are FixedPoint.Unsigned, be sure to use `rawValue` when appropriate!
                    const accountMinCollateralValueAfter = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                        users.userOne.address,
                        this.mcr,
                    );
                    const accountCollateralValueAfter = await hre.Diamond.getAccountCollateralValue(
                        users.userOne.address,
                    );
                    expect(accountMinCollateralValueAfter.rawValue.lte(accountCollateralValueAfter.rawValue)).to
                        .be.true;
                });

                it("should allow withdraws that exceed deposits and only send the user total deposit available", async function () {
                    const userOneInitialCollateralBalance = await this.collateral.balanceOf(users.userOne.address);

                    // First repay Kresko assets so we can withdraw all collateral
                    await expect(
                        hre.Diamond.connect(users.userOne).burnKreskoAsset(
                            users.userOne.address,
                            this.krAsset.address,
                            this.mintAmount,
                            0,
                        )
                    ).to.not.be.reverted;

                    // The burn fee was taken from deposited collateral, so fetch the current deposited amount
                    const currentAmountDeposited = await hre.Diamond.collateralDeposits(
                        users.userOne.address,
                        this.collateral.address,
                    );

                    const overflowWithdrawAmount = currentAmountDeposited.add(toBig(10))
                    await hre.Diamond.connect(users.userOne).withdrawCollateral(
                        users.userOne.address,
                        this.collateral.address,
                        overflowWithdrawAmount,
                        0,
                    );

                    // Check that the user's full deposited amount was withdrawn instead of the overflow amount
                    const userOneBalanceAfterOverflowWithdraw = await this.collateral.balanceOf(users.userOne.address);
                    expect(userOneBalanceAfterOverflowWithdraw).eq(userOneInitialCollateralBalance.add(currentAmountDeposited));

                    const kreskoCollateralBalanceAfterOverflowWithdraw = await this.collateral.balanceOf(hre.Diamond.address);
                    expect(kreskoCollateralBalanceAfterOverflowWithdraw).eq(0);
                });

                it("should revert if withdrawing an amount of 0", async function () {
                    const withdrawAmount = 0;
                    await expect(
                        hre.Diamond.connect(users.userOne).withdrawCollateral(users.userOne.address, this.collateral.address, 0, withdrawAmount),
                    ).to.be.revertedWith(Error.ZERO_WITHDRAW);
                });

                it("should revert if the withdrawal violates the health factor", async function () {
                    // userOne has a debt position, so attempting to withdraw the entire collateral deposit should be impossible
                    const withdrawAmount = this.initialBalance;

                    // Ensure that the withdrawal would in fact put the account's collateral value
                    // less than the account's minimum collateral value:
                    const accountMinCollateralValue = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
                        users.userOne.address,
                        this.mcr,
                    );
                    const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(
                        users.userOne.address,
                    );
                    const [withdrawnCollateralValue] = await hre.Diamond.getCollateralValueAndOraclePrice(
                        this.collateral.address,
                        withdrawAmount,
                        false,
                    );
                    expect(
                        accountCollateralValue.rawValue
                            .sub(withdrawnCollateralValue.rawValue)
                            .lt(accountMinCollateralValue.rawValue),
                    ).to.be.true;

                    await expect(
                        hre.Diamond.connect(users.userOne).withdrawCollateral(
                            users.userOne.address,
                            this.collateral.address,
                            withdrawAmount,
                            0,
                        ),
                    ).to.be.revertedWith(Error.COLLATERAL_INSUFFICIENT_AMOUNT);
                });

                it("should revert if the depositedCollateralAssetIndex is incorrect", async function () {
                    const withdrawAmount = this.depositAmount.div(2);
                    await expect(
                        hre.Diamond.connect(users.userOne).withdrawCollateral(
                            users.userOne.address,
                            this.collateral.address,
                            withdrawAmount,
                            1, // Incorrect index
                        ),
                    ).to.be.revertedWith(Error.ARRAY_OUT_OF_BOUNDS);
                });
            });
        });
    });
});
