import { fromBig, getInternalEvent, toBig } from "@kreskolabs/lib";
import {
    Action,
    BASIS_POINT,
    defaultCollateralArgs,
    defaultDecimals,
    defaultKrAssetArgs,
    defaultOraclePrice,
    Role,
    withFixture,
    wrapContractWithSigner,
} from "@test-utils";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";
import { Error } from "@utils/test/errors";
import {
    addMockCollateralAsset,
    depositCollateral,
    getCollateralConfig,
    withdrawCollateral,
} from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";
import {
    CollateralDepositedEventObject,
    CollateralWithdrawnEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

describe("Minter - Deposit Withdraw", () => {
    withFixture(["minter-test"]);

    beforeEach(async function () {
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

        this.depositArgs = {
            user: hre.users.userOne,
            asset: this.collateral,
            amount: toBig(10000),
        };
    });

    describe("#collateral", () => {
        describe("#deposit", () => {
            it("should revert if withdrawing a krAsset collateral causing lower deposit amount than MIN_KRASSET_COLLATERAL_AMOUNT", async function () {
                const arbitraryUser = hre.users.testUserSeven;
                const collateralAmount = toBig(100);

                const newKrAsset = await addMockKreskoAsset({
                    name: "krTSLA",
                    symbol: "krTSLA",
                    marketOpen: true,
                    factor: 1,
                    closeFee: 0,
                    openFee: 0,
                    price: 10,
                    supplyLimit: 2_000,
                });

                await newKrAsset.setBalance(arbitraryUser, collateralAmount);
                await newKrAsset.mocks!.contract.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: collateralAmount.mul(4),
                    },
                });

                await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
                    newKrAsset.address,
                    await getCollateralConfig(
                        newKrAsset.contract,
                        newKrAsset.anchor.address,
                        toBig(1),
                        toBig(1.05),
                        newKrAsset.mocks.clFeed.address,
                    ),
                );
                const depositAmount = collateralAmount.div(2);
                await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                    arbitraryUser.address,
                    newKrAsset.address,
                    depositAmount,
                );
                // Rebase the asset according to params
                const denominator = 4;
                const positive = true;
                await newKrAsset.contract.rebase(toBig(denominator), positive, []);

                const rebasedDepositAmount = depositAmount.mul(denominator);
                const withdrawAmount = rebasedDepositAmount.sub((9e11).toString());

                expect(
                    await wrapContractWithSigner(hre.Diamond, hre.users.deployer).getDepositedCollateralAssets(
                        arbitraryUser.address,
                    ),
                ).to.deep.equal([newKrAsset.address]);

                await expect(
                    wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        newKrAsset.address,
                        withdrawAmount,
                        0,
                    ),
                ).to.be.revertedWith(Error.COLLATERAL_AMOUNT_TOO_LOW);
            });
            it("should revert if depositing a krAsset collateral causing lower deposit amount than MIN_KRASSET_COLLATERAL_AMOUNT", async function () {
                const arbitraryUser = hre.users.testUserSeven;
                const collateralAmount = toBig(100);

                const newKrAsset = await addMockKreskoAsset({
                    name: "krTSLA",
                    symbol: "krTSLA",
                    marketOpen: true,
                    factor: 1,
                    closeFee: 0,
                    openFee: 0,
                    price: 10,
                    supplyLimit: 2_000,
                });

                await newKrAsset.setBalance(arbitraryUser, collateralAmount);
                await newKrAsset.mocks!.contract.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: collateralAmount.mul(4),
                    },
                });

                await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
                    newKrAsset.address,
                    await getCollateralConfig(
                        newKrAsset.contract,
                        newKrAsset.anchor.address,
                        toBig(1),
                        toBig(1.05),
                        newKrAsset.mocks.clFeed.address,
                    ),
                );

                await expect(
                    wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        newKrAsset.address,
                        (9e11).toString(),
                    ),
                ).to.be.revertedWith(Error.COLLATERAL_AMOUNT_TOO_LOW);
            });

            it("should allow an account to deposit whitelisted collateral", async function () {
                // Account has no deposited assets
                const depositedCollateralAssetsBefore = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).getDepositedCollateralAssets(this.depositArgs.user.address);
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                // Deposit collateral
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Account now has deposited assets
                const depositedCollateralAssetsAfter = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).getDepositedCollateralAssets(this.depositArgs.user.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address]);
                // Account's collateral deposit balances have increased
                expect(
                    await wrapContractWithSigner(hre.Diamond, hre.users.deployer).collateralDeposits(
                        this.depositArgs.user.address,
                        this.collateral.address,
                    ),
                ).to.equal(this.depositArgs.amount);
                // Kresko contract's collateral balance has increased
                expect(await this.collateral.contract.balanceOf(hre.Diamond.address)).to.equal(this.depositArgs.amount);
                // Account's collateral balance has decreased
                expect(fromBig(await this.collateral.contract.balanceOf(hre.users.userOne.address))).to.equal(
                    fromBig(this.initialBalance) - fromBig(this.depositArgs.amount),
                );
            });

            it("should allow an arbitrary account to deposit whitelisted collateral on behalf of another account", async function () {
                // Load arbitrary user with sufficient collateral for testing purposes
                const arbitraryUser = hre.users.userThree;
                await this.collateral.mocks!.contract.setVariable("_balances", {
                    [arbitraryUser.address]: this.initialBalance,
                });
                await this.collateral.mocks!.contract.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });

                // Initially, the array of the user's deposited collateral assets should be empty.
                const depositedCollateralAssetsBefore = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).getDepositedCollateralAssets(this.depositArgs.user.address);
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                // Deposit collateral
                await expect(
                    wrapContractWithSigner(hre.Diamond, hre.users.userThree).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets has been pushed to.
                const depositedCollateralAssetsAfter = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).getDepositedCollateralAssets(this.depositArgs.user.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).collateralDeposits(this.depositArgs.user.address, this.collateral.address);
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
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Deposit second batch of collateral
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).getDepositedCollateralAssets(this.depositArgs.user.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).collateralDeposits(this.depositArgs.user.address, this.collateral.address);
                expect(amountDeposited).to.equal(this.depositArgs.amount.add(this.depositArgs.amount));
            });

            it("should allow an account to have deposited multiple collateral assets", async function () {
                // Load user account with a different type of collateral
                const collateralArgs = {
                    name: "Collateral18Dec",
                    price: defaultOraclePrice, // $1
                    factor: 1,
                    decimals: defaultDecimals,
                };
                const { contract, mocks } = await addMockCollateralAsset(collateralArgs);

                await mocks!.contract.setVariable("_balances", {
                    [hre.users.userOne.address]: this.initialBalance,
                });
                await mocks!.contract.setVariable("_allowances", {
                    [hre.users.userOne.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });

                // Deposit batch of first collateral type
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Deposit batch of second collateral type
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        contract.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                // Confirm the array of the user's deposited collateral assets contains both collateral assets
                const depositedCollateralAssetsAfter = await wrapContractWithSigner(
                    hre.Diamond,
                    hre.users.deployer,
                ).getDepositedCollateralAssets(this.depositArgs.user.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([this.collateral.address, contract.address]);
            });

            it("should emit CollateralDeposited event", async function () {
                const tx = await wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                    this.depositArgs.user.address,
                    this.collateral.address,
                    this.depositArgs.amount,
                );
                const event = await getInternalEvent<CollateralDepositedEventObject>(
                    tx,
                    hre.Diamond,
                    "CollateralDeposited",
                );
                expect(event.account).to.equal(this.depositArgs.user.address);
                expect(event.collateralAsset).to.equal(this.collateral.address);
                expect(event.amount).to.equal(this.depositArgs.amount);
            });

            it("should revert if depositing collateral that has not been whitelisted", async function () {
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        "0x0000000000000000000000000000000000000001",
                        this.depositArgs.amount,
                    ),
                ).to.be.revertedWith(Error.COLLATERAL_DOESNT_EXIST);
            });

            it("should revert if depositing an amount of 0", async function () {
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.address,
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
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.contract.address,
                        0,
                    ),
                ).to.be.revertedWith(Error.ZERO_DEPOSIT);
            });
        });

        describe("#withdraw", () => {
            beforeEach(async function () {
                // Deposit collateral
                await expect(
                    wrapContractWithSigner(hre.Diamond, this.depositArgs.user).depositCollateral(
                        this.depositArgs.user.address,
                        this.collateral.contract.address,
                        this.depositArgs.amount,
                    ),
                ).not.to.be.reverted;

                this.collateral = this.collaterals![0];
                this.depositAmount = this.depositArgs.amount;
            });

            describe("when the account's minimum collateral value is 0", function () {
                it("should allow an account to withdraw their entire deposit", async function () {
                    const depositedCollateralAssets = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssets(hre.users.userOne.address);
                    expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

                    await wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                        hre.users.userOne.address,
                        this.collateral.address,
                        this.depositAmount,
                        0,
                    );

                    // Ensure that the collateral asset is removed from the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssetsPostWithdraw = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssets(hre.users.userOne.address);
                    expect(depositedCollateralAssetsPostWithdraw).to.deep.equal([]);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(hre.users.userOne.address, this.collateral.address);
                    expect(amountDeposited).to.equal(0);

                    // Ensure the amount transferred is correct
                    const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(0);
                    const userOneBalance = await this.collateral.contract.balanceOf(hre.users.userOne.address);
                    expect(userOneBalance).to.equal(this.initialBalance);
                });

                it("should allow an account to withdraw a portion of their deposit", async function () {
                    const withdrawAmount = this.depositAmount.div(2);

                    await wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                        hre.users.userOne.address,
                        this.collateral.address,
                        withdrawAmount,
                        0, // The index of this.collateral.address in the account's depositedCollateralAssets
                    );

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(hre.users.userOne.address, this.collateral.address);
                    expect(amountDeposited).to.equal(this.depositAmount.sub(withdrawAmount));

                    // Ensure that the collateral asset is still in the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssets(hre.users.userOne.address);
                    expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

                    const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                    expect(kreskoBalance).to.equal(this.depositAmount.sub(withdrawAmount));
                    const userOneBalance = await this.collateral.contract.balanceOf(hre.users.userOne.address);
                    expect(userOneBalance).to.equal(this.initialBalance.sub(amountDeposited));
                });

                it("should allow trusted address to withdraw another accounts deposit", async function () {
                    // Grant userThree the MANAGER role
                    await wrapContractWithSigner(hre.Diamond, hre.users.deployer).grantRole(
                        Role.MANAGER,
                        hre.users.userThree.address,
                    );
                    expect(await hre.Diamond.hasRole(Role.MANAGER, hre.users.userThree.address)).to.equal(true);

                    const collateralBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(hre.users.userOne.address, this.collateral.address);

                    await expect(
                        wrapContractWithSigner(hre.Diamond, hre.users.userThree).withdrawCollateral(
                            hre.users.userOne.address,
                            this.collateral.address,
                            this.depositAmount,
                            0,
                        ),
                    ).to.not.be.reverted;

                    const collateralAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(hre.users.userOne.address, this.collateral.address);
                    // Ensure that collateral was withdrawn
                    expect(collateralAfter).to.equal(collateralBefore.sub(this.depositAmount));
                });

                it("should emit CollateralWithdrawn event", async function () {
                    const tx = await wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                        hre.users.userOne.address,
                        this.collateral.address,
                        this.depositAmount,
                        0,
                    );

                    const event = await getInternalEvent<CollateralWithdrawnEventObject>(
                        tx,
                        hre.Diamond,
                        "CollateralWithdrawn",
                    );
                    expect(event.account).to.equal(hre.users.userOne.address);
                    expect(event.collateralAsset).to.equal(this.collateral.address);
                    expect(event.amount).to.equal(this.depositAmount);
                });

                it("should not allow untrusted address to withdraw another accounts deposit", async function () {
                    await expect(
                        wrapContractWithSigner(hre.Diamond, hre.users.userThree).withdrawCollateral(
                            hre.users.userOne.address,
                            this.collateral.address,
                            this.initialBalance,
                            0,
                        ),
                    ).to.be.revertedWith(
                        `AccessControl: account ${hre.users.userThree.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                    );
                });

                describe("when the account's minimum collateral value is > 0", () => {
                    beforeEach(async function () {
                        this.krAsset = hre.krAssets.find(
                            asset => asset.deployArgs!.symbol === defaultKrAssetArgs.symbol,
                        )!;

                        // userOne mints some kr assets
                        this.mintAmount = toBig(100);
                        await wrapContractWithSigner(hre.Diamond, hre.users.userOne).mintKreskoAsset(
                            hre.users.userOne.address,
                            this.krAsset!.address,
                            this.mintAmount,
                        );
                        // Mint amount differs from deposited amount due to open fee
                        const amountDeposited = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).collateralDeposits(hre.users.userOne.address, this.collateral.address);
                        this.initialUserOneDeposited = amountDeposited;

                        this.mcr = await hre.Diamond.minimumCollateralizationRatio();
                    });

                    it("should allow an account to withdraw their deposit if it does not violate the health factor", async function () {
                        const withdrawAmount = toBig(10);

                        // Ensure that the withdrawal would not put the account's collateral value
                        // less than the account's minimum collateral value:
                        const accountMinCollateralValue = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getAccountMinimumCollateralValueAtRatio(hre.users.userOne.address, this.mcr);
                        const accountCollateralValue = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getAccountCollateralValue(hre.users.userOne.address);
                        const [withdrawnCollateralValue] = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getCollateralValueAndOraclePrice(this.collateral.address, withdrawAmount, false);
                        expect(accountCollateralValue.sub(withdrawnCollateralValue).gte(accountMinCollateralValue)).to
                            .be.true;

                        await wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                            hre.users.userOne.address,
                            this.collateral.address,
                            withdrawAmount,
                            0,
                        );
                        // Ensure that the collateral asset is still in the account's deposited collateral
                        // assets array.
                        const depositedCollateralAssets = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getDepositedCollateralAssets(hre.users.userOne.address);
                        expect(depositedCollateralAssets).to.deep.equal([this.collateral.address]);

                        // Ensure the change in the user's deposit is recorded.
                        const amountDeposited = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).collateralDeposits(hre.users.userOne.address, this.collateral.address);

                        expect(amountDeposited).to.equal(this.depositAmount.sub(withdrawAmount));

                        // Check the balances of the contract and user
                        const kreskoBalance = await this.collateral.contract.balanceOf(hre.Diamond.address);
                        expect(kreskoBalance).to.equal(this.depositAmount.sub(withdrawAmount));
                        const userOneBalance = await this.collateral.contract.balanceOf(hre.users.userOne.address);
                        expect(userOneBalance).to.equal(
                            this.initialBalance.sub(this.depositAmount.sub(withdrawAmount)),
                        );

                        // Ensure the account's minimum collateral value is <= the account collateral value
                        const accountMinCollateralValueAfter = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getAccountMinimumCollateralValueAtRatio(hre.users.userOne.address, this.mcr);
                        const accountCollateralValueAfter = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getAccountCollateralValue(hre.users.userOne.address);
                        expect(accountMinCollateralValueAfter.lte(accountCollateralValueAfter)).to.be.true;
                    });

                    it("should allow withdraws that exceed deposits and only send the user total deposit available", async function () {
                        const user = hre.users.userFour;

                        await this.collateral.setBalance!(user, BigNumber.from(0));
                        await this.collateral.setBalance!(user, toBig(1000));
                        await this.collateral.contract
                            .connect(user)
                            .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

                        await depositCollateral({
                            asset: this.collateral,
                            amount: toBig(1000),
                            user,
                        });

                        await withdrawCollateral({
                            asset: this.collateral,
                            amount: toBig(1010),
                            user,
                        });
                        expect(await this.collateral.contract.balanceOf(user.address)).to.equal(toBig(1000));
                    });

                    it("should revert if withdrawing an amount of 0", async function () {
                        const withdrawAmount = 0;
                        await expect(
                            wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                                hre.users.userOne.address,
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
                        const accountMinCollateralValue = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getAccountMinimumCollateralValueAtRatio(hre.users.userOne.address, this.mcr);
                        const accountCollateralValue = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getAccountCollateralValue(hre.users.userOne.address);
                        const [withdrawnCollateralValue] = await wrapContractWithSigner(
                            hre.Diamond,
                            hre.users.deployer,
                        ).getCollateralValueAndOraclePrice(this.collateral.address, withdrawAmount, false);
                        expect(accountCollateralValue.sub(withdrawnCollateralValue).lt(accountMinCollateralValue)).to.be
                            .true;

                        await expect(
                            wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                                hre.users.userOne.address,
                                this.collateral.address,
                                withdrawAmount,
                                0,
                            ),
                        ).to.be.revertedWith(Error.COLLATERAL_INSUFFICIENT_AMOUNT);
                    });

                    it("should revert if the depositedCollateralAssetIndex is incorrect", async function () {
                        const withdrawAmount = this.depositAmount.div(2);
                        await expect(
                            wrapContractWithSigner(hre.Diamond, hre.users.userOne).withdrawCollateral(
                                hre.users.userOne.address,
                                this.collateral.address,
                                withdrawAmount,
                                1, // Incorrect index
                            ),
                        ).to.be.revertedWith(Error.ARRAY_OUT_OF_BOUNDS);
                    });
                });
            });
        });

        describe("#deposit - rebase events", () => {
            const mintAmount = toBig(100);
            let arbitraryUser: SignerWithAddress;
            beforeEach(async function () {
                arbitraryUser = hre.users.userThree;
                await this.collateral.mocks!.contract.setVariable("_balances", {
                    [arbitraryUser.address]: this.initialBalance,
                });
                await this.collateral.mocks!.contract.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });
                this.krAsset = this.krAssets!.find(k => k.deployArgs!.name === defaultKrAssetArgs.name)!;
                // grant operator role to deployer for rebases
                await this.krAsset!.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);
                const assetInfo = await this.krAsset!.kresko();
                const oracle = await wrapContractWithSigner(hre.Diamond, hre.users.deployer).getChainlinkFeed(
                    assetInfo.id,
                );

                // Add krAsset as a collateral with anchor and cFactor of 1
                await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
                    this.krAsset!.contract.address,
                    await getCollateralConfig(
                        this.krAsset.contract,
                        this.krAsset!.anchor!.address,
                        toBig(1),
                        toBig(1.05),
                        oracle,
                    ),
                );

                // Allowance for Kresko
                await this.krAsset!.contract.connect(arbitraryUser).approve(
                    hre.Diamond.address,
                    hre.ethers.constants.MaxUint256,
                );

                // Deposit some collateral
                await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                    arbitraryUser.address,
                    this.collateral.address,
                    this.depositArgs.amount,
                );

                // Mint some krAssets
                await wrapContractWithSigner(hre.Diamond, arbitraryUser).mintKreskoAsset(
                    arbitraryUser.address,
                    this.krAsset!.address,
                    mintAmount,
                );

                // Deposit all debt on tests
                this.krAssetCollateralAmount = await wrapContractWithSigner(hre.Diamond, arbitraryUser).kreskoAssetDebt(
                    arbitraryUser.address,
                    this.krAsset!.address,
                );
            });
            describe("deposit amounts are calculated correctly", () => {
                it("when deposit is made before positive rebase", async function () {
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const expectedDepositsAfter = this.krAssetCollateralAmount.mul(denominator);

                    const depositsBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(expectedDepositsAfter);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(0);
                });
                it("when deposit is made before negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const depositAmountAfterRebase = this.krAssetCollateralAmount.div(denominator);

                    // Deposit
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    const depositsBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(depositAmountAfterRebase);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(0);
                });
                it("when deposit is made after an positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const depositAmount = this.krAssetCollateralAmount.mul(denominator);

                    const depositsBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                    );

                    // Get collateral deposits after
                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(depositAmount);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(0);
                });
                it("when deposit is made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const depositAmount = this.krAssetCollateralAmount.div(denominator);

                    const depositsBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                    );

                    // Get collateral deposits after
                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsBefore).to.not.bignumber.equal(finalDeposits);
                    expect(finalDeposits).to.bignumber.equal(depositAmount);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(0);
                });
                it("when deposit is made before and after a positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositBeforeRebase,
                    );
                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get deposits after
                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfter).to.bignumber.equal(halfDepositAfterRebase);

                    // Deposit second time
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositAfterRebase,
                    );
                    // Get deposits after
                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    expect(finalDeposits).to.bignumber.equal(fullDepositAmount);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(0);
                });
                it("when deposit is made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).div(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositBeforeRebase,
                    );
                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get deposits after
                    const depositsAfterRebase = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfterRebase).to.bignumber.equal(halfDepositAfterRebase);

                    // Deposit second time
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositAfterRebase,
                    );
                    // Get deposits after
                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    expect(finalDeposits).to.bignumber.equal(fullDepositAmount);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(0);
                });
            });
            describe("deposit usd values are calculated correctly", () => {
                it("when deposit is made before positiveing rebase", async function () {
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );
                    const valueBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getAccountCollateralValue(arbitraryUser.address);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    const newPrice = fromBig(await this.krAsset!.getPrice!(), 8) / denominator;
                    this.krAsset!.setPrice!(newPrice);
                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get collateral value of account after
                    const valueAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getAccountCollateralValue(arbitraryUser.address);

                    // Ensure that the collateral value stays the same
                    expect(valueBefore).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made before negative rebase", async function () {
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );
                    const valueBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getAccountCollateralValue(arbitraryUser.address);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await this.krAsset!.getPrice!(), 8) * denominator;
                    this.krAsset!.setPrice(newPrice);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get collateral value of account after
                    const valueAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getAccountCollateralValue(arbitraryUser.address);

                    // Ensure that the collateral value stays the same
                    expect(valueBefore).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made after an positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                    // Get expected value before rebase and deposit
                    const [expectedValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, this.krAssetCollateralAmount, false);

                    const depositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                    );

                    // Get collateral value of account after
                    const [valueAfter] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, depositAmount, false);

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                    // Get expected value before rebase and deposit
                    const [expectedValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, this.krAssetCollateralAmount, false);

                    const depositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                    );

                    // Get collateral value of account after
                    const [valueAfter] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, depositAmount, false);

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfter);
                });
                it("when deposit is made before and after a positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositBeforeRebase,
                    );

                    const [expectedValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, halfDepositBeforeRebase, false);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, halfDepositAfterRebase, false);

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Calculate added value since price adjusted in the rebase
                    const [expectedValueAfterSecondDeposit] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, fullDepositAmount, false);

                    // Deposit more
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositAfterRebase,
                    );

                    // Get value
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral value stays the same
                    expect(finalValue).to.bignumber.equal(expectedValueAfterSecondDeposit);
                });
                it("when deposit is made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                    // Deposit half before, half after
                    const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2);
                    const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).div(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositBeforeRebase,
                    );

                    const [expectedValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, halfDepositBeforeRebase, false);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, halfDepositAfterRebase, false);

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Calculate added value since price adjusted in the rebase
                    const [expectedValueAfterSecondDeposit] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.krAsset!.address, fullDepositAmount, false);

                    // Deposit more
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        halfDepositAfterRebase,
                    );

                    // Get deposits after
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral value stays the same
                    expect(finalValue).to.bignumber.equal(expectedValueAfterSecondDeposit);
                });
            });
        });

        describe("#withdraw - rebase events", () => {
            const mintAmount = toBig(100);
            let arbitraryUser: SignerWithAddress;
            beforeEach(async function () {
                arbitraryUser = hre.users.userThree;
                await this.collateral.mocks!.contract.setVariable("_balances", {
                    [arbitraryUser.address]: this.initialBalance,
                });
                await this.collateral.mocks!.contract.setVariable("_allowances", {
                    [arbitraryUser.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });
                this.krAsset = this.krAssets!.find(k => k.deployArgs!.name === defaultKrAssetArgs.name)!;
                // grant operator role to deployer for rebases
                await this.krAsset!.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);
                const assetInfo = await this.krAsset!.kresko();
                const oracle = await wrapContractWithSigner(hre.Diamond, hre.users.deployer).getChainlinkFeed(
                    assetInfo.id,
                );

                // Add krAsset as a collateral with anchor and cFactor of 1
                await wrapContractWithSigner(hre.Diamond, hre.users.deployer).addCollateralAsset(
                    this.krAsset!.contract.address,
                    await getCollateralConfig(
                        this.krAsset.contract,
                        this.krAsset!.anchor!.address,
                        toBig(1),
                        toBig(1.05),
                        oracle,
                    ),
                );

                // Allowance for Kresko
                await this.krAsset!.contract.connect(arbitraryUser).approve(
                    hre.Diamond.address,
                    hre.ethers.constants.MaxUint256,
                );

                // Deposit some collateral
                await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                    arbitraryUser.address,
                    this.collateral.address,
                    this.depositArgs.amount,
                );

                // Mint some krAssets
                await wrapContractWithSigner(hre.Diamond, arbitraryUser).mintKreskoAsset(
                    arbitraryUser.address,
                    this.krAsset!.address,
                    mintAmount,
                );

                // Deposit all debt on tests
                this.krAssetCollateralAmount = await wrapContractWithSigner(hre.Diamond, arbitraryUser).kreskoAssetDebt(
                    arbitraryUser.address,
                    this.krAsset!.address,
                );
            });
            describe("withdraw amounts are calculated correctly", () => {
                it("when withdrawing a deposit made before positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Deposit collateral before rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                        cIndex,
                    );

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    const finalBalance = await this.krAsset!.contract.balanceOf(arbitraryUser.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made before negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Deposit collateral before rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    // Ensure that the collateral balance is adjusted by the rebase
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                        cIndex,
                    );

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    const finalBalance = await this.krAsset!.contract.balanceOf(arbitraryUser.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made after an positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                    );

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Get collateral deposits after
                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                        cIndex,
                    );

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    const finalBalance = await this.krAsset!.contract.balanceOf(arbitraryUser.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.equal(rebasedDepositAmount);
                });
                it("when withdrawing a deposit made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                    );
                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Get collateral deposits after
                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral balance is what was deposited as no rebases occured after
                    expect(depositsAfter).to.bignumber.equal(rebasedDepositAmount);

                    // Withdraw rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                        cIndex,
                    );

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    const finalBalance = await this.krAsset!.contract.balanceOf(arbitraryUser.address);

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
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        firstDepositAmount,
                    );
                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Get deposits before
                    const depositsFirst = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    expect(depositsFirst).to.bignumber.equal(firstDepositAmount);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        secondDepositAmount,
                    );

                    // Get collateral deposits after
                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Ensure deposit balance matches expected
                    expect(depositsAfter).to.bignumber.equal(fullDepositAmount);

                    // Withdraw rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        fullDepositAmount,
                        cIndex,
                    );

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    const finalBalance = await this.krAsset!.contract.balanceOf(arbitraryUser.address);

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
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        firstDepositAmount,
                    );
                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Get deposits before
                    const depositsFirst = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    expect(depositsFirst).to.bignumber.equal(firstDepositAmount);

                    // Rebase the asset according to params
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit after the rebase
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        secondDepositAmount,
                    );

                    // Get collateral deposits after
                    const depositsAfter = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);

                    // Ensure deposit balance matches expected
                    expect(depositsAfter).to.bignumber.equal(fullDepositAmount);

                    // Withdraw rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        fullDepositAmount,
                        cIndex,
                    );

                    const finalDeposits = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).collateralDeposits(arbitraryUser.address, this.krAsset!.address);
                    const finalBalance = await this.krAsset!.contract.balanceOf(arbitraryUser.address);

                    expect(finalDeposits).to.equal(0);
                    expect(finalBalance).to.bignumber.equal(fullDepositAmount);
                });

                it("when withdrawing a non-rebased collateral after a rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;
                    const withdrawAmount = toBig(10);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    const nrcBalanceBefore = await this.collateral.contract.balanceOf(arbitraryUser.address);
                    const expectedNrcBalanceAfter = nrcBalanceBefore.add(withdrawAmount);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.collateral.address);
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.collateral.address,
                        withdrawAmount,
                        cIndex,
                    );

                    expect(await this.collateral.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        expectedNrcBalanceAfter,
                    );
                });
            });
            describe("withdraw usd values are calculated correctly", () => {
                it("when withdrawing a deposit made before positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                        cIndex,
                    );
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    expect(finalValue).to.equal(0);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        rebasedDepositAmount,
                    );
                });
                it("when withdrawing a deposit made before negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;
                    const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Deposit
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);

                    // Withdraw the full rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        rebasedDepositAmount,
                        cIndex,
                    );
                    // Get value
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);
                    expect(finalValue).to.equal(0);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        rebasedDepositAmount,
                    );
                });
                it("when withdrwaing a deposit made after an positiveing rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                    const depositAmount = this.krAssetCollateralAmount.mul(denominator);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                    );
                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);
                    // Withdraw the full rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                        cIndex,
                    );
                    // Get value
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);
                    expect(finalValue).to.equal(0);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        depositAmount,
                    );
                });
                it("when withdrawing a deposit made after an negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                    const depositAmount = this.krAssetCollateralAmount.div(denominator);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Deposit rebased amount after
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                    );
                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);
                    // Withdraw the full rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        depositAmount,
                        cIndex,
                    );
                    // Get value
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);
                    expect(finalValue).to.equal(0);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        depositAmount,
                    );
                });
                it("when withdrawing a deposit made before and after a positive rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;

                    // Deposit half before, half after
                    const firstDepositAmount = this.krAssetCollateralAmount.div(2);
                    const secondDepositAmount = this.krAssetCollateralAmount.div(2).mul(denominator);
                    const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        firstDepositAmount,
                    );

                    const [expectedValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Deposit more
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        secondDepositAmount,
                    );

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);
                    // Withdraw the full rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        fullDepositAmount,
                        cIndex,
                    );
                    // Get value
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    expect(finalValue).to.equal(0);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        fullDepositAmount,
                    );
                });
                it("when withdrawing a deposit made before and after a negative rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) * denominator;

                    // Deposit half before, half after
                    const firstDepositAmount = this.krAssetCollateralAmount.div(2);
                    const secondDepositAmount = this.krAssetCollateralAmount.div(denominator).div(2);
                    const fullDepositAmount = this.krAssetCollateralAmount.div(denominator);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        firstDepositAmount,
                    );

                    const [expectedValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    // Get value after
                    const [valueAfterRebase] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    // Ensure that the collateral value stays the same
                    expect(expectedValue).to.bignumber.equal(valueAfterRebase);

                    // Deposit more
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        secondDepositAmount,
                    );

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.krAsset!.address);
                    // Withdraw the full rebased amount
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        fullDepositAmount,
                        cIndex,
                    );
                    // Get value
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.krAsset!.address);

                    expect(finalValue).to.equal(0);
                    expect(await this.krAsset!.contract.balanceOf(arbitraryUser.address)).to.bignumber.equal(
                        fullDepositAmount,
                    );
                });
                it("when withdrawing a non-rebased collateral after a rebase", async function () {
                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const newPrice = fromBig(await this.krAsset!.getPrice(), 8) / denominator;
                    const withdrawAmount = toBig(10);

                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).depositCollateral(
                        arbitraryUser.address,
                        this.krAsset!.address,
                        this.krAssetCollateralAmount,
                    );

                    const accountValueBefore = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getAccountCollateralValue(arbitraryUser.address);
                    const [nrcValueBefore] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.collateral.address);
                    const [withdrawValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralValueAndOraclePrice(this.collateral.address, withdrawAmount, false);
                    const expectedNrcValueAfter = nrcValueBefore.sub(withdrawValue);

                    // Rebase the asset according to params
                    this.krAsset!.setPrice(newPrice);
                    await this.krAsset!.contract.rebase(toBig(denominator), positive, []);

                    const cIndex = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getDepositedCollateralAssetIndex(arbitraryUser.address, this.collateral.address);
                    await wrapContractWithSigner(hre.Diamond, arbitraryUser).withdrawCollateral(
                        arbitraryUser.address,
                        this.collateral.address,
                        withdrawAmount,
                        cIndex,
                    );
                    const finalAccountValue = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getAccountCollateralValue(arbitraryUser.address);
                    const [finalValue] = await wrapContractWithSigner(
                        hre.Diamond,
                        hre.users.deployer,
                    ).getCollateralAdjustedAndRealValue(arbitraryUser.address, this.collateral.address);

                    expect(finalValue).to.equal(expectedNrcValueAfter);
                    expect(finalAccountValue).to.bignumber.equal(accountValueBefore.sub(withdrawValue));
                });
            });
        });
    });
});
