import { fromBig, getInternalEvent, toBig } from "@kreskolabs/lib";
import { Action, DepositWithdrawFixture, Role, depositWithdrawFixture } from "@test-utils";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";
import { wrapKresko } from "@utils/redstone";
import { Error } from "@utils/test/errors";
import { depositCollateral, withdrawCollateral } from "@utils/test/helpers/collaterals";
import optimized from "@utils/test/helpers/optimizations";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";
import {
    CollateralDepositedEventObject,
    CollateralWithdrawnEventObject,
    Kresko,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

describe("Minter - Deposit Withdraw", function () {
    let depositor: SignerWithAddress;
    let withdrawer: SignerWithAddress;

    let user: SignerWithAddress;
    let User: Kresko;
    let Depositor: Kresko;
    let Withdrawer: Kresko;

    let f: DepositWithdrawFixture;
    this.slow(600);

    beforeEach(async function () {
        f = await depositWithdrawFixture();
        f.KrAssetCollateral.setPrice(10);
        [[user, User], [depositor, Depositor], [withdrawer, Withdrawer]] = f.users;
    });

    describe("#collateral", () => {
        describe("#deposit", () => {
            it("reverts withdraws of krAsset collateral when deposits go below MIN_KRASSET_COLLATERAL_AMOUNT", async function () {
                const collateralAmount = toBig(100);
                await f.KrAssetCollateral.setBalance(user, collateralAmount, hre.Diamond.address);
                const depositAmount = collateralAmount.div(2);
                await User.depositCollateral(user.address, f.KrAssetCollateral.address, depositAmount);
                // Rebase the asset according to params
                const denominator = 4;
                const positive = true;
                await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                const rebasedDepositAmount = depositAmount.mul(denominator);
                const withdrawAmount = rebasedDepositAmount.sub((9e11).toString());

                expect(await hre.Diamond.getAccountCollateralAssets(user.address)).to.include(
                    f.KrAssetCollateral.address,
                );

                await expect(
                    User.withdrawCollateral(user.address, f.KrAssetCollateral.address, withdrawAmount, 0),
                ).to.be.revertedWith(Error.COLLATERAL_AMOUNT_TOO_LOW);
            });

            it("reverts deposits of krAsset collateral for less than MIN_KRASSET_COLLATERAL_AMOUNT", async function () {
                const collateralAmount = toBig(100);
                await f.KrAssetCollateral.setBalance(user, collateralAmount, hre.Diamond.address);
                await expect(
                    User.depositCollateral(user.address, f.KrAssetCollateral.address, (9e11).toString()),
                ).to.be.revertedWith(Error.COLLATERAL_AMOUNT_TOO_LOW);
            });

            it("should allow an account to deposit whitelisted collateral", async function () {
                await expect(Depositor.depositCollateral(depositor.address, f.Collateral.address, f.initialDeposits))
                    .not.to.be.reverted;

                // Account has deposit entry
                const depositedCollateralAssetsAfter = await optimized.getAccountCollateralAssets(depositor.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address]);

                // Account's collateral deposit balances have increased
                expect(await optimized.getAccountCollateralAmount(depositor.address, f.Collateral.address)).to.equal(
                    f.initialDeposits,
                );
                // Kresko's balance has increased
                expect(await f.Collateral.balanceOf(hre.Diamond.address)).to.equal(
                    f.initialDeposits.add(f.initialDeposits),
                );
                // Account's balance has decreased
                expect(fromBig(await f.Collateral.balanceOf(depositor.address))).to.equal(
                    fromBig(f.initialBalance) - fromBig(f.initialDeposits),
                );
            });

            it("should allow an arbitrary account to deposit whitelisted collateral on behalf of another account", async function () {
                // Initially, the array of the user's deposited collateral assets should be empty.
                const depositedCollateralAssetsBefore = await hre.Diamond.getAccountCollateralAssets(user.address);
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                // Deposit collateral, from depositor -> user.
                await expect(Depositor.depositCollateral(user.address, f.Collateral.address, f.initialDeposits)).not.to
                    .be.reverted;

                // Confirm the array of the user's deposited collateral assets has been pushed to.
                const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(user.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
                    user.address,
                    f.Collateral.address,
                );
                expect(amountDeposited).to.equal(f.initialDeposits);

                // Confirm the amount as been transferred from the user into Kresko.sol
                const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address);
                expect(kreskoBalance).to.equal(f.initialDeposits.add(f.initialDeposits));

                // Confirm the depositor's wallet balance has been adjusted accordingly
                const depositorBalanceAfter = await f.Collateral.balanceOf(depositor.address);
                expect(fromBig(depositorBalanceAfter)).to.equal(fromBig(f.initialBalance) - fromBig(f.initialDeposits));
            });

            it("should allow an account to deposit more collateral to an existing deposit", async function () {
                // Deposit first batch of collateral
                await expect(Depositor.depositCollateral(depositor.address, f.Collateral.address, f.initialDeposits))
                    .not.to.be.reverted;

                // Deposit second batch of collateral
                await expect(Depositor.depositCollateral(depositor.address, f.Collateral.address, f.initialDeposits))
                    .not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(depositor.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
                    depositor.address,
                    f.Collateral.address,
                );
                expect(amountDeposited).to.equal(f.initialDeposits.add(f.initialDeposits));
            });

            it("should allow an account to have deposited multiple collateral assets", async function () {
                // Load user account with a different type of collateral
                await f.Collateral2.setBalance(depositor, f.initialBalance, hre.Diamond.address);

                // Deposit batch of first collateral type
                await expect(Depositor.depositCollateral(depositor.address, f.Collateral.address, f.initialDeposits))
                    .not.to.be.reverted;

                // Deposit batch of second collateral type
                await expect(Depositor.depositCollateral(depositor.address, f.Collateral2.address, f.initialDeposits))
                    .not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets contains both collateral assets
                const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(depositor.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address, f.Collateral2.address]);
            });

            it("should emit CollateralDeposited event", async function () {
                const tx = await Depositor.depositCollateral(
                    depositor.address,
                    f.Collateral.address,
                    f.initialDeposits,
                );
                const event = await getInternalEvent<CollateralDepositedEventObject>(
                    tx,
                    hre.Diamond,
                    "CollateralDeposited",
                );
                expect(event.account).to.equal(depositor.address);
                expect(event.collateralAsset).to.equal(f.Collateral.address);
                expect(event.amount).to.equal(f.initialDeposits);
            });

            it("should revert if depositing collateral that has not been whitelisted", async function () {
                await expect(
                    Depositor.depositCollateral(
                        depositor.address,
                        "0x0000000000000000000000000000000000000001",
                        f.initialDeposits,
                    ),
                ).to.be.revertedWith(Error.COLLATERAL_DOESNT_EXIST);
            });

            it("should revert if depositing an amount of 0", async function () {
                await expect(
                    Depositor.depositCollateral(depositor.address, f.Collateral.address, 0),
                ).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
            it("should revert if collateral is not depositable", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[f.Collateral.address], Action.DEPOSIT, true, 0],
                    [deployer, devTwo, extOne],
                );

                const isDepositPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    f.Collateral.address,
                );
                expect(isDepositPaused).to.equal(true);

                await expect(
                    wrapKresko(hre.Diamond, depositor).depositCollateral(
                        depositor.address,
                        f.Collateral.contract.address,
                        0,
                    ),
                ).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
        });

        describe("#withdraw", () => {
            describe("when the account's minimum collateral value is 0", function () {
                it("should allow an account to withdraw their entire deposit", async function () {
                    const depositedCollateralAssets = await hre.Diamond.getAccountCollateralAssets(withdrawer.address);
                    expect(depositedCollateralAssets).to.deep.equal([f.Collateral.address]);

                    await Withdrawer.withdrawCollateral(withdrawer.address, f.Collateral.address, f.initialDeposits, 0);

                    // Ensure that the collateral asset is removed from the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssetsPostWithdraw = await hre.Diamond.getAccountCollateralAssets(
                        withdrawer.address,
                    );
                    expect(depositedCollateralAssetsPostWithdraw).to.deep.equal([]);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.Collateral.address,
                    );
                    expect(amountDeposited).to.equal(0);

                    // Ensure the amount transferred is correct
                    const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(0);
                    const userOneBalance = await f.Collateral.balanceOf(withdrawer.address);
                    expect(userOneBalance).to.equal(f.initialDeposits);
                });

                it("should allow an account to withdraw a portion of their deposit", async function () {
                    const withdrawAmount = f.initialDeposits.div(2);

                    await Withdrawer.withdrawCollateral(withdrawer.address, f.Collateral.address, withdrawAmount, 0);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.Collateral.address,
                    );
                    expect(amountDeposited).to.equal(f.initialDeposits.sub(withdrawAmount));

                    // Ensure that the collateral asset is still in the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await hre.Diamond.getAccountCollateralAssets(withdrawer.address);
                    expect(depositedCollateralAssets).to.deep.equal([f.Collateral.address]);

                    const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(f.initialDeposits.sub(withdrawAmount));
                    const userOneBalance = await f.Collateral.balanceOf(withdrawer.address);
                    expect(userOneBalance).to.equal(f.initialDeposits.sub(amountDeposited));
                });

                it("should allow trusted address to withdraw another accounts deposit", async function () {
                    // Grant userThree the MANAGER role
                    await hre.Diamond.grantRole(Role.MANAGER, user.address);
                    expect(await hre.Diamond.hasRole(Role.MANAGER, user.address)).to.equal(true);

                    const collateralBefore = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.Collateral.address,
                    );

                    await expect(
                        User.withdrawCollateral(withdrawer.address, f.Collateral.address, f.initialDeposits, 0),
                    ).to.not.be.reverted;

                    const collateralAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.Collateral.address,
                    );
                    // Ensure that collateral was withdrawn
                    expect(collateralAfter).to.equal(collateralBefore.sub(f.initialDeposits));
                });

                it("should emit CollateralWithdrawn event", async function () {
                    const tx = await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.Collateral.address,
                        f.initialDeposits,
                        0,
                    );

                    const event = await getInternalEvent<CollateralWithdrawnEventObject>(
                        tx,
                        hre.Diamond,
                        "CollateralWithdrawn",
                    );
                    expect(event.account).to.equal(withdrawer.address);
                    expect(event.collateralAsset).to.equal(f.Collateral.address);
                    expect(event.amount).to.equal(f.initialDeposits);
                });

                it("should not allow untrusted address to withdraw another accounts deposit", async function () {
                    await expect(
                        User.withdrawCollateral(withdrawer.address, f.Collateral.address, f.initialBalance, 0),
                    ).to.be.revertedWith(
                        `AccessControl: account ${user.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                    );
                });

                describe("when the account's minimum collateral value is > 0", () => {
                    beforeEach(async function () {
                        // userOne mints some kr assets
                        this.mintAmount = toBig(100);
                        await Withdrawer.mintKreskoAsset(withdrawer.address, f.KrAsset!.address, this.mintAmount);
                        // Mint amount differs from deposited amount due to open fee
                        const amountDeposited = await optimized.getAccountCollateralAmount(
                            withdrawer.address,
                            f.Collateral.address,
                        );
                        this.initialUserOneDeposited = amountDeposited;

                        this.mcr = await optimized.getMinCollateralRatio();
                    });

                    it("should allow an account to withdraw their deposit if it does not violate the health factor", async function () {
                        const withdrawAmount = toBig(10);

                        // Ensure that the withdrawal would not put the account's collateral value
                        // less than the account's minimum collateral value:
                        const [accMinCollateralValue, accCollateralValue, withdrawnCollateralValue] = await Promise.all(
                            [
                                hre.Diamond.getAccountMinCollateralAtRatio(withdrawer.address, this.mcr),
                                hre.Diamond.getAccountCollateralValue(withdrawer.address),
                                hre.Diamond.getCollateralAmountToValue(
                                    f.Collateral.address,
                                    withdrawAmount,
                                    false,
                                ).then(([value]) => value),
                            ],
                        );

                        expect(accCollateralValue.sub(withdrawnCollateralValue).gte(accMinCollateralValue)).to.be.true;

                        await Withdrawer.withdrawCollateral(
                            withdrawer.address,
                            f.Collateral.address,
                            withdrawAmount,
                            0,
                        );
                        // Ensure that the collateral asset is still in the account's deposited collateral
                        // assets array.
                        const depositedCollateralAssets = await optimized.getAccountCollateralAssets(
                            withdrawer.address,
                        );
                        expect(depositedCollateralAssets).to.deep.equal([f.Collateral.address]);

                        // Ensure the change in the user's deposit is recorded.
                        const amountDeposited = await optimized.getAccountCollateralAmount(
                            withdrawer.address,
                            f.Collateral.address,
                        );

                        expect(amountDeposited).to.equal(f.initialDeposits.sub(withdrawAmount));

                        // Check the balances of the contract and user
                        const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address);
                        expect(kreskoBalance).to.equal(f.initialDeposits.sub(withdrawAmount));
                        const withdrawerBalance = await f.Collateral.balanceOf(withdrawer.address);
                        expect(withdrawerBalance).to.equal(withdrawAmount);

                        // Ensure the account's minimum collateral value is <= the account collateral value
                        const accountMinCollateralValueAfter = await hre.Diamond.getAccountMinCollateralAtRatio(
                            withdrawer.address,
                            this.mcr,
                        );
                        const accountCollateralValueAfter = await hre.Diamond.getAccountCollateralValue(
                            withdrawer.address,
                        );
                        expect(accountMinCollateralValueAfter.lte(accountCollateralValueAfter)).to.be.true;
                    });

                    it("should allow withdraws that exceed deposits and only send the user total deposit available", async function () {
                        const randomUser = hre.users.userFour;

                        await f.Collateral.setBalance!(randomUser, BigNumber.from(0));
                        await f.Collateral.setBalance!(randomUser, toBig(1000));
                        await f.Collateral.contract
                            .connect(randomUser)
                            .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

                        await depositCollateral({
                            asset: f.Collateral,
                            amount: toBig(1000),
                            user: randomUser,
                        });

                        await withdrawCollateral({
                            asset: f.Collateral,
                            amount: toBig(1010),
                            user: randomUser,
                        });
                        expect(await f.Collateral.balanceOf(randomUser.address)).to.equal(toBig(1000));
                    });

                    it("should revert if withdrawing an amount of 0", async function () {
                        const withdrawAmount = 0;
                        await expect(
                            Withdrawer.withdrawCollateral(withdrawer.address, f.Collateral.address, 0, withdrawAmount),
                        ).to.be.revertedWith(Error.ZERO_WITHDRAW);
                    });

                    it("should revert if the withdrawal violates the health factor", async function () {
                        // userOne has a debt position, so attempting to withdraw the entire collateral deposit should be impossible
                        const withdrawAmount = f.initialBalance;

                        // Ensure that the withdrawal would in fact put the account's collateral value
                        // less than the account's minimum collateral value:
                        const accountMinCollateralValue = await hre.Diamond.getAccountMinCollateralAtRatio(
                            withdrawer.address,
                            this.mcr,
                        );
                        const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(withdrawer.address);
                        const [withdrawnCollateralValue] = await hre.Diamond.getCollateralAmountToValue(
                            f.Collateral.address,
                            withdrawAmount,
                            false,
                        );
                        expect(accountCollateralValue.sub(withdrawnCollateralValue).lt(accountMinCollateralValue)).to.be
                            .true;

                        await expect(
                            Withdrawer.withdrawCollateral(withdrawer.address, f.Collateral.address, withdrawAmount, 0),
                        ).to.be.revertedWith(Error.COLLATERAL_INSUFFICIENT_AMOUNT);
                    });

                    it("should revert if the depositedCollateralAssetIndex is incorrect", async function () {
                        const withdrawAmount = f.initialDeposits.div(2);
                        await expect(
                            Withdrawer.withdrawCollateral(
                                withdrawer.address,
                                f.Collateral.address,
                                withdrawAmount,
                                1, // Incorrect index
                            ),
                        ).to.be.revertedWith(Error.ARRAY_OUT_OF_BOUNDS);
                    });
                });
            });
        });

        describe("#deposit - rebase", function () {
            const mintAmount = toBig(100);
            this.slow(1500);
            beforeEach(async function () {
                await f.Collateral.setBalance(user, f.initialBalance, hre.Diamond.address);

                // Add krAsset as a collateral with anchor and cFactor of 1
                // Allowance for Kresko
                await f.KrAssetCollateral.contract.setVariable("_allowances", {
                    [user.address]: {
                        [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
                    },
                });

                // Deposit some collateral
                await User.depositCollateral(user.address, f.Collateral.address, f.initialDeposits);

                // Mint some krAssets
                await User.mintKreskoAsset(user.address, f.KrAssetCollateral.address, mintAmount);

                // Deposit all debt on tests
                this.krAssetCollateralAmount = await User.getAccountDebtAmount(
                    user.address,
                    f.KrAssetCollateral.address,
                );
            });
            describe("deposit amounts are calculated correctly", function () {
                it("when deposit is made before positive rebase", async function () {
                    await User.depositCollateral(
                        user.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const expectedDepositsAfter = this.krAssetCollateralAmount.mul(denominator);

                    const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(expectedDepositsAfter);
                    expect(await f.KrAssetCollateral.balanceOf(user.address)).to.bignumber.equal(0);
                });
                it("when deposit is made before negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const depositAmountAfterRebase = this.krAssetCollateralAmount.div(denominator);

                    // Deposit
                    await User.depositCollateral(
                        user.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(depositAmountAfterRebase);
                    expect(await f.KrAssetCollateral.balanceOf(user.address)).to.bignumber.equal(0);
                });
                it("when deposit is made after an positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const depositAmount = this.krAssetCollateralAmount.mul(denominator);

                    const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, depositAmount);

                    // Get collateral deposits after
                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(depositAmount);
                    expect(await f.KrAssetCollateral.balanceOf(user.address)).to.bignumber.equal(0);
                });
                it("when deposit is made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const depositAmount = this.krAssetCollateralAmount.div(denominator);

                    const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, depositAmount);

                    // Get collateral deposits after
                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(depositAmount);
                    expect(await f.KrAssetCollateral.balanceOf(user.address)).to.bignumber.equal(0);
                });
                it("when deposit is made before and after a positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase);
                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get deposits after
                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfter).to.bignumber.equal(halfDepositAfterRebase);

                    // Deposit second time
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositAfterRebase);
                    // Get deposits after
                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    expect(finalDeposits).to.bignumber.equal(fullDepositAmount);
                    expect(await f.KrAssetCollateral.balanceOf(user.address)).to.bignumber.equal(0);
                });
                it("when deposit is made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).div(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase);
                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get deposits after
                    const depositsAfterRebase = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfterRebase).to.bignumber.equal(halfDepositAfterRebase);

                    // Deposit second time
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositAfterRebase);
                    // Get deposits after
                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    expect(finalDeposits).to.bignumber.equal(fullDepositAmount);
                    expect(await f.KrAssetCollateral.balanceOf(user.address)).to.bignumber.equal(0);
                });
            });
            describe("deposit usd values are calculated correctly", () => {
                it("when deposit is made before positiveing rebase", async function () {
                    await User.depositCollateral(
                        user.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );
                    const valueBefore = await hre.Diamond.getAccountCollateralValue(user.address);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice!(), 8) / denominator;
                    f.KrAssetCollateral.setPrice!(newPrice);
                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get collateral value of account after
                    const valueAfter = await hre.Diamond.getAccountCollateralValue(user.address);

                    // Ensure that the collateral value stays the same
                    expect(valueBefore).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made before negative rebase", async function () {
                    await User.depositCollateral(
                        user.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );
                    const valueBefore = await hre.Diamond.getAccountCollateralValue(user.address);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice!(), 8) * denominator;
                    f.KrAssetCollateral.setPrice(newPrice);

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get collateral value of account after
                    const valueAfter = await hre.Diamond.getAccountCollateralValue(user.address);

                    // Ensure that the collateral value stays the same
                    expect(valueBefore).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made after an positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;

                    // Get expected value before rebase and deposit
                    const [expectedValue] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                        false,
                    );

                    const depositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, depositAmount);

                    // Get collateral value of account after
                    const [valueAfter] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        depositAmount,
                        false,
                    );

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator;

                    // Get expected value before rebase and deposit
                    const [expectedValue] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                        false,
                    );

                    const depositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, depositAmount);

                    // Get collateral value of account after
                    const [valueAfter] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        depositAmount,
                        false,
                    );

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made before and after a positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase);

                    const [expectedValue] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        halfDepositBeforeRebase,
                        false,
                    );

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        halfDepositAfterRebase,
                        false,
                    );

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Calculate added value since price adjusted in the rebase
                    const [expectedValueAfterSecondDeposit] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        fullDepositAmount,
                        false,
                    );

                    // Deposit more
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositAfterRebase);

                    // Get value
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral value stays the same
                    expect(finalValue).to.bignumber.equal(expectedValueAfterSecondDeposit);
                });
                it("when deposit is made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).div(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase);

                    const [expectedValue] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        halfDepositBeforeRebase,
                        false,
                    );

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        halfDepositAfterRebase,
                        false,
                    );

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Calculate added value since price adjusted in the rebase
                    const [expectedValueAfterSecondDeposit] = await hre.Diamond.getCollateralAmountToValue(
                        f.KrAssetCollateral.address,
                        fullDepositAmount,
                        false,
                    );

                    // Deposit more
                    await User.depositCollateral(user.address, f.KrAssetCollateral.address, halfDepositAfterRebase);

                    // Get deposits after
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        user.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral value stays the same
                    expect(finalValue).to.bignumber.equal(expectedValueAfterSecondDeposit);
                });
            });
        });

        describe("#withdraw - rebase", function () {
            const mintAmount = toBig(100);
            this.slow(1500);
            beforeEach(async function () {
                await Withdrawer.mintKreskoAsset(withdrawer.address, f.KrAssetCollateral.address, mintAmount);

                // Deposit all debt on tests
                this.krAssetCollateralAmount = await optimized.getAccountDebtAmount(
                    withdrawer.address,
                    f.KrAssetCollateral,
                );
            });
            describe("withdraw amounts are calculated correctly", () => {
                it("when withdrawing a deposit made before positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Deposit collateral before rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    const finalBalance = await f.KrAssetCollateral.contract.balanceOf(withdrawer.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made before negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator);
                    // Deposit collateral before rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    const finalBalance = await f.KrAssetCollateral.contract.balanceOf(withdrawer.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made after an positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                    );

                    // Get collateral deposits after
                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    const finalBalance = await f.KrAssetCollateral.contract.balanceOf(withdrawer.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                    );

                    // Get collateral deposits after
                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    const finalBalance = await f.KrAssetCollateral.contract.balanceOf(withdrawer.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made before and after a positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Deposit half before, half (rebase adjusted) after
                    const firstDepositAmount = this.krAssetCollateralAmount.div(2);
                    const secondDepositAmount = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Deposit before the rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        firstDepositAmount,
                    );

                    // Get deposits before
                    const depositsFirst = await optimized.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    expect(depositsFirst).to.bignumber.equal(firstDepositAmount);

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        secondDepositAmount,
                    );

                    // Get collateral deposits after
                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure deposit balance matches expected
                    expect(depositsAfter).to.bignumber.equal(fullDepositAmount);

                    // Withdraw rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        fullDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    const finalBalance = await f.KrAssetCollateral.contract.balanceOf(withdrawer.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(fullDepositAmount);
                });
                it("when withdrawing a deposit made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Deposit half before, half (rebase adjusted) after
                    const firstDepositAmount = this.krAssetCollateralAmount.div(2);
                    const secondDepositAmount = this.krAssetCollateralAmount.div(2).div(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Deposit before the rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        firstDepositAmount,
                    );

                    // Get deposits before
                    const depositsFirst = await optimized.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    expect(depositsFirst).to.bignumber.equal(firstDepositAmount);

                    // Rebase the asset according to params
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        secondDepositAmount,
                    );

                    // Get collateral deposits after
                    const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure deposit balance matches expected
                    expect(depositsAfter).to.bignumber.equal(fullDepositAmount);

                    // Withdraw rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        fullDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );

                    const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    const finalBalance = await f.KrAssetCollateral.contract.balanceOf(withdrawer.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.bignumber.equal(fullDepositAmount);
                });

                it("when withdrawing a non-rebased collateral after a rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;
                    const withdrawAmount = toBig(10);

                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    const nrcBalanceBefore = await f.Collateral.contract.balanceOf(withdrawer.address);
                    const expectedNrcBalanceAfter = nrcBalanceBefore.add(withdrawAmount);

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.Collateral.address,
                        withdrawAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.Collateral.address),
                    );

                    expect(await f.Collateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        expectedNrcBalanceAfter,
                    );
                });
            });
            describe("withdraw usd values are calculated correctly", () => {
                it("when withdrawing a deposit made before positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    expect(finalValue).to.equal(0);
                    expect(await f.KrAssetCollateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        rebasedDepositAmount,
                    );
                });
                it("when withdrawing a deposit made before negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Deposit
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Withdraw the full rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        rebasedDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    // Get value
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    expect(finalValue).to.equal(0);
                    expect(await f.KrAssetCollateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        rebasedDepositAmount,
                    );
                });
                it("when withdrwaing a deposit made after an positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;

                    const depositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await Withdrawer.depositCollateral(withdrawer.address, f.KrAssetCollateral.address, depositAmount);

                    // Withdraw the full rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        depositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    // Get value
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    expect(finalValue).to.equal(0);
                    expect(await f.KrAssetCollateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        depositAmount,
                    );
                });
                it("when withdrawing a deposit made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator;

                    const depositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await Withdrawer.depositCollateral(withdrawer.address, f.KrAssetCollateral.address, depositAmount);

                    // Withdraw the full rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        depositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    // Get value
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );
                    expect(finalValue).to.equal(0);
                    expect(await f.KrAssetCollateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        depositAmount,
                    );
                });
                it("when withdrawing a deposit made before and after a positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;

                    // Deposit half before, half after
                    const firstDepositAmount = this.krAssetCollateralAmount.div(2);
                    const secondDepositAmount = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        firstDepositAmount,
                    );

                    const [expectedValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Deposit more
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        secondDepositAmount,
                    );

                    // Withdraw the full rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        fullDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    // Get value
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    expect(finalValue).to.equal(0);
                    expect(await f.KrAssetCollateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        fullDepositAmount,
                    );
                });
                it("when withdrawing a deposit made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator;

                    // Deposit half before, half after
                    const firstDepositAmount = this.krAssetCollateralAmount.div(2);
                    const secondDepositAmount = this.krAssetCollateralAmount.div(denominator).div(2);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        firstDepositAmount,
                    );

                    const [expectedValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Deposit more
                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        secondDepositAmount,
                    );

                    // Withdraw the full rebased amount
                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        fullDepositAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    // Get value
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                    );

                    expect(finalValue).to.equal(0);
                    expect(await f.KrAssetCollateral.contract.balanceOf(withdrawer.address)).to.bignumber.equal(
                        fullDepositAmount,
                    );
                });
                it("when withdrawing a non-rebased collateral after a rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator;
                    const withdrawAmount = toBig(10);

                    await Withdrawer.depositCollateral(
                        withdrawer.address,
                        f.KrAssetCollateral.address,
                        this.krAssetCollateralAmount,
                    );

                    const accountValueBefore = await hre.Diamond.getAccountCollateralValue(withdrawer.address);
                    const [nrcValueBefore] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.Collateral.address,
                    );
                    const [withdrawValue] = await hre.Diamond.getCollateralAmountToValue(
                        f.Collateral.address,
                        withdrawAmount,
                        false,
                    );
                    const expectedNrcValueAfter = nrcValueBefore.sub(withdrawValue);

                    // Rebase the asset according to params
                    f.KrAssetCollateral.setPrice(newPrice);
                    await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, []);

                    await Withdrawer.withdrawCollateral(
                        withdrawer.address,
                        f.Collateral.address,
                        withdrawAmount,
                        optimized.getAccountDepositIndex(withdrawer.address, f.KrAssetCollateral.address),
                    );
                    const finalAccountValue = await hre.Diamond.getAccountCollateralValue(withdrawer.address);
                    const [finalValue] = await hre.Diamond.getAccountCollateralValueOf(
                        withdrawer.address,
                        f.Collateral.address,
                    );

                    expect(finalValue).to.equal(expectedNrcValueAfter);
                    expect(finalAccountValue).to.bignumber.equal(accountValueBefore.sub(withdrawValue));
                });
            });
        });
    });
});
