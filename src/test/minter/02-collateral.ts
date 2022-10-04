import { Action, Fee, addMockCollateralAsset, defaultDecimals, defaultOraclePrice, Role, withFixture } from "@test-utils";
import { extractInternalIndexedEventFromTxReceipt } from "@utils";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";
import { fromBig, toBig } from "@utils/numbers";
import { Error } from "@utils/test/errors";
import { expect } from "chai";
import hre, { users } from "hardhat";
import { MinterEvent__factory } from "types";
import {
    CollateralDepositedEventObject,
    CollateralWithdrawnEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

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
            it("should revert if collateral is not depositable", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
                    [deployer, devTwo, extOne],
                );

                const isDepositPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isDepositPaused).to.equal(true);

                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.contract.address,
                        0,
                    ),
                ).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
        });

        describe("#withdrawCollateral", () => {
            beforeEach(async function () {
                // Deposit collateral
                await expect(
                    hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.contract.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                this.collateral = this.collaterals[0];
                this.depositAmount = this.depositArgs.amount;
            });

            describe("when the account's minimum collateral value is 0", function () {
                it("should allow an account to withdraw their entire deposit", async function () {
                    const depositedCollateralAssets = await hre.Diamond.getDepositedCollateralAssets(
                        users.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

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
                    const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(0);
                    const userOneBalance = await this.collateral.contract.balanceOf(users.userOne.address);
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
                    expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

                    const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(this.depositAmount.sub(withdrawAmount));
                    const userOneBalance = await this.collateral.contract.balanceOf(users.userOne.address);
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

                it("should emit CollateralWithdrawn event", async function () {
                    const tx = await hre.Diamond.connect(users.userOne).withdrawCollateral(
                        users.userOne.address,
                        this.collateral.address,
                        this.depositAmount,
                        0,
                    );

                    const event = await extractInternalIndexedEventFromTxReceipt<CollateralWithdrawnEventObject>(
                        tx,
                        MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                        "CollateralWithdrawn",
                    );
                    expect(event.account).to.equal(users.userOne.address);
                    expect(event.collateralAsset).to.equal(this.collateral.address);
                    expect(event.amount).to.equal(this.depositAmount);
                });

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

                describe("when the account's minimum collateral value is > 0", function () {
                    beforeEach(async function () {
                        this.krAsset = this.krAssets[0];

                        // userOne mints some kr assets
                        this.mintAmount = toBig(100);
                        await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                            users.userOne.address,
                            this.krAsset.address,
                            this.mintAmount,
                        );

                        // Mint amount differs from deposited amount due to open fee, see open fee test below
                        const amountDeposited = await hre.Diamond.collateralDeposits(
                            users.userOne.address,
                            this.collateral.address,
                        );
                        this.initialUserOneDeposited = amountDeposited;

                        // Load the MCR for testing purposes
                        this.mcr = await hre.Diamond.minimumCollateralizationRatio();
                    });

                    it("should correctly assess the open fee on krAsset creation", async function () {
                        // Confirm that the open fee for our recent mint was correctly assessed
                        const feeRes = await hre.Diamond.calcExpectedFee(
                            users.userOne.address,
                            this.krAsset.address,
                            this.mintAmount,
                            Fee.OPEN
                        );
                        const output: string[] = feeRes.toString().split(",");
                        this.openFeeCollateralType = output[0];
                        this.openFeeAmount = toBig(Number(output[1]) / 10**18);

                        const amountDeposited = await hre.Diamond.collateralDeposits(
                            users.userOne.address,
                            this.collateral.address,
                        );
                        expect(amountDeposited).eq(this.depositAmount.sub(this.openFeeAmount));
                    })

                    it("should allow an account to withdraw their deposit if it does not violate the health factor", async function () {
                        const userOneBalancePreWithdrawal = await this.collateral.contract.balanceOf(users.userOne.address);
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
                        expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

                        // Ensure the change in the user's deposit is recorded.
                        const amountDeposited = await hre.Diamond.collateralDeposits(
                            users.userOne.address,
                            this.collateral.address,
                        );
                        expect(amountDeposited).eq(this.initialUserOneDeposited.sub(withdrawAmount));

                        // Check the balances of the Kresko contract
                        const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                        expect(kreskoBalance).to.equal(this.initialUserOneDeposited.sub(withdrawAmount));
                        // Check the balances of user one
                        const userOneBalance = await this.collateral.contract.balanceOf(users.userOne.address);
                        expect(userOneBalance).to.equal(userOneBalancePreWithdrawal.add(withdrawAmount));

                        // Ensure the account's minimum collateral value is <= the account collateral value
                        // These are FixedPoint.Unsigned, be sure to use `rawValue` when appropriate!
                        const accountMinCollateralValueAfter =
                            await hre.Diamond.getAccountMinimumCollateralValueAtRatio(users.userOne.address, this.mcr);
                        const accountCollateralValueAfter = await hre.Diamond.getAccountCollateralValue(
                            users.userOne.address,
                        );
                        expect(accountMinCollateralValueAfter.rawValue.lte(accountCollateralValueAfter.rawValue)).to.be
                            .true;
                    });

                    it("should allow withdraws that exceed deposits and only send the user total deposit available", async function () {
                        const userOneInitialCollateralBalance = await this.collateral.contract.balanceOf(
                            users.userOne.address,
                        );

                        // First repay Kresko assets so we can withdraw all collateral
                        await expect(
                            hre.Diamond.connect(users.userOne).burnKreskoAsset(
                                users.userOne.address,
                                this.krAsset.address,
                                this.mintAmount,
                                0,
                            ),
                        ).to.not.be.reverted;

                        // The burn fee was taken from deposited collateral, so fetch the current deposited amount
                        const currentAmountDeposited = await hre.Diamond.collateralDeposits(
                            users.userOne.address,
                            this.collateral.address,
                        );

                        const overflowWithdrawAmount = currentAmountDeposited.add(toBig(10));
                        await hre.Diamond.connect(users.userOne).withdrawCollateral(
                            users.userOne.address,
                            this.collateral.address,
                            overflowWithdrawAmount,
                            0,
                        );

                        // Check that the user's full deposited amount was withdrawn instead of the overflow amount
                        const userOneBalanceAfterOverflowWithdraw = await this.collateral.contract.balanceOf(
                            users.userOne.address,
                        );
                        expect(userOneBalanceAfterOverflowWithdraw).eq(
                            userOneInitialCollateralBalance.add(currentAmountDeposited),
                        );

                        const kreskoCollateralBalanceAfterOverflowWithdraw = await this.collateral.contract.balanceOf(
                            hre.Diamond.address,
                        );
                        expect(kreskoCollateralBalanceAfterOverflowWithdraw).eq(0);
                    });

                    it("should revert if withdrawing an amount of 0", async function () {
                        const withdrawAmount = 0;
                        await expect(
                            hre.Diamond.connect(users.userOne).withdrawCollateral(
                                users.userOne.address,
                                this.collateral.address,
                                0,
                                withdrawAmount,
                            ),
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
});
