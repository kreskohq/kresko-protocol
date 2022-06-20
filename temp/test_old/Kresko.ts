import hre from "hardhat";
import { expect } from "chai";
import { Result } from "@ethersproject/abi";
import {
    addNewKreskoAssetWithOraclePrice,
    ADDRESS_ONE,
    ADDRESS_TWO,
    ADDRESS_ZERO,
    BURN_FEE,
    CollateralAssetInfo,
    deployAndWhitelistCollateralAsset,
    FEE_RECIPIENT_ADDRESS,
    fromBig,
    LIQUIDATION_INCENTIVE,
    MINIMUM_COLLATERALIZATION_RATIO,
    MINIMUM_DEBT_VALUE,
    SECONDS_UNTIL_PRICE_STALE,
    NAME_ONE,
    NAME_TWO,
    ONE,
    MaxUint256,
    parseEther,
    setupTests,
    SYMBOL_ONE,
    SYMBOL_TWO,
    MARKET_CAP_ONE_MILLION,
    MARKET_CAP_FIVE_MILLION,
    ZERO_POINT_FIVE,
    formatEther,
    toFixedPoint,
    fixedPointDiv,
    fixedPointMul,
    BigNumber,
    extractEventFromTxReceipt,
    extractEventsFromTxReceipt,
    toBig,
} from "@utils";
import {
    KreskoAssetBurnedEvent,
    BurnFeePaidEvent,
    MinimumCollateralizationRatioUpdatedEvent,
    LiquidationIncentiveMultiplierUpdatedEvent,
    LiquidationOccurredEvent,
} from "types/typechain/Kresko";

describe("Kresko", function () {
    before(async function () {
        // We intentionally allow constructor that calls the initializer
        // modifier and explicitly allow this in calls to `deployProxy`.
        // The upgrades library will still print warnings, so to avoid clutter
        // we just silence those here.
        console.log("Intentionally silencing Upgrades warnings");
        hre.upgrades.silenceWarnings();
    });

    beforeEach(async function () {
        const { signers, kresko } = await setupTests();
        this.signers = signers;
        this.Kresko = kresko;
    });

    describe("#initialize", function () {
        it("should initialize the contract with the correct parameters", async function () {
            expect(await this.Kresko.burnFee()).to.equal(BURN_FEE);
            expect(await this.Kresko.feeRecipient()).to.equal(FEE_RECIPIENT_ADDRESS);
            expect(await this.Kresko.liquidationIncentiveMultiplier()).to.equal(LIQUIDATION_INCENTIVE);
            expect(await this.Kresko.minimumCollateralizationRatio()).to.equal(MINIMUM_COLLATERALIZATION_RATIO);
        });

        it("should not allow being called more than once", async function () {
            await expect(
                this.Kresko.initialize(
                    BURN_FEE,
                    FEE_RECIPIENT_ADDRESS,
                    LIQUIDATION_INCENTIVE,
                    MINIMUM_COLLATERALIZATION_RATIO,
                    MINIMUM_DEBT_VALUE,
                    SECONDS_UNTIL_PRICE_STALE,
                ),
            ).to.be.revertedWith("Initializable: contract is already initialized");
        });
    });

    describe("#ownership", function () {
        it("should have the admin as owner", async function () {
            expect(await this.Kresko.owner()).to.equal(this.signers.admin.address);
            expect(await this.Kresko.pendingOwner()).to.equal(ADDRESS_ZERO);
        });

        it("should allow ownership transfer through claim and be able to call onlyOwner function", async function () {
            await this.Kresko.transferOwnership(this.signers.userOne.address);
            const pendingOwner = await this.Kresko.pendingOwner();

            expect(pendingOwner).to.equal(this.signers.userOne.address);
            await this.Kresko.connect(this.signers.userOne).claimOwnership();

            const newOwner = await this.Kresko.owner();
            expect(newOwner).to.equal(this.signers.userOne.address);

            const MAX_BURN_FEE = await this.Kresko.MAX_BURN_FEE();
            await expect(this.Kresko.connect(this.signers.userOne).updateBurnFee(MAX_BURN_FEE)).to.be.not.reverted;

            const newBurnFee = await this.Kresko.burnFee();
            expect(newBurnFee).to.equal(MAX_BURN_FEE);
        });

        it("should set pending owner to address zero after pending ownership is claimed", async function () {
            await this.Kresko.transferOwnership(this.signers.userOne.address);
            const pendingOwner = await this.Kresko.pendingOwner();
            expect(pendingOwner).to.equal(this.signers.userOne.address);
            await this.Kresko.connect(this.signers.userOne).claimOwnership();

            const pendingOwnerAfterClaim = await this.Kresko.pendingOwner();
            expect(pendingOwnerAfterClaim).to.equal(ADDRESS_ZERO);
        });

        it("should not allow an address other than the pending owner to claim pending ownership", async function () {
            await this.Kresko.transferOwnership(this.signers.userOne.address);
            const pendingOwner = await this.Kresko.pendingOwner();
            expect(pendingOwner).to.equal(this.signers.userOne.address);
            await expect(this.Kresko.connect(this.signers.userTwo).claimOwnership()).to.be.revertedWith(
                "Ownable: caller != pending owner",
            );
        });

        it("should not allow old owner to call onlyOwner functions", async function () {
            await this.Kresko.transferOwnership(this.signers.userOne.address);
            const pendingOwner = await this.Kresko.pendingOwner();
            expect(pendingOwner).to.equal(this.signers.userOne.address);
            await this.Kresko.connect(this.signers.userOne).claimOwnership();

            const MAX_BURN_FEE = await this.Kresko.MAX_BURN_FEE();
            await expect(this.Kresko.connect(this.signers.admin).updateBurnFee(MAX_BURN_FEE)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });

        it("should not allow ownership transfer to zero address", async function () {
            await expect(this.Kresko.transferOwnership(ADDRESS_ZERO)).to.be.revertedWith(
                "Ownable: new owner is the zero address",
            );
        });
    });

    describe("Collateral Assets", function () {
        beforeEach(async function () {
            this.collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18);
        });

        describe("#addCollateralAsset", function () {
            it("should allow owner to add assets", async function () {
                const collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18);

                const asset = await this.Kresko.collateralAssets(collateralAssetInfo.collateralAsset.address);
                expect(asset.factor.rawValue).to.equal(collateralAssetInfo.factor);
                expect(asset.oracle).to.equal(collateralAssetInfo.oracle.address);
                expect(asset.exists).to.be.true;
            });

            it("should not allow collateral assets to be added more than once", async function () {
                await expect(
                    this.Kresko.addCollateralAsset(
                        this.collateralAssetInfo.collateralAsset.address,
                        ONE,
                        ADDRESS_ONE,
                        false,
                    ),
                ).to.be.revertedWith("KR: collateralExists");
            });

            it("should not allow collateral assets with invalid asset address", async function () {
                await expect(this.Kresko.addCollateralAsset(ADDRESS_ZERO, ONE, ADDRESS_ONE, false)).to.be.revertedWith(
                    "KR: !collateralAddr",
                );
            });

            it("should not allow collateral assets with collateral factor", async function () {
                await expect(
                    this.Kresko.addCollateralAsset(ADDRESS_TWO, ONE.add(1), ADDRESS_ONE, false),
                ).to.be.revertedWith("KR: factor > 1FP");
            });

            it("should not allow collateral assets with invalid oracle address", async function () {
                await expect(this.Kresko.addCollateralAsset(ADDRESS_TWO, ONE, ADDRESS_ZERO, false)).to.be.revertedWith(
                    "KR: !oracleAddr",
                );
            });

            it("should not allow non-owner to add assets", async function () {
                await expect(
                    this.Kresko.connect(this.signers.userOne).addCollateralAsset(ADDRESS_TWO, 1, ADDRESS_TWO, false),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateCollateralAsset", function () {
            it("should allow owner to update collateral asset's factor", async function () {
                let info = this.collateralAssetInfo;
                await this.Kresko.updateCollateralAsset(
                    info.collateralAsset.address,
                    ZERO_POINT_FIVE,
                    info.oracle.address,
                );

                const asset = await this.Kresko.collateralAssets(info.collateralAsset.address);
                expect(asset.factor.rawValue).to.equal(ZERO_POINT_FIVE);
            });

            it("should allow owner to update collateral asset's oracle address", async function () {
                let info = this.collateralAssetInfo;
                await this.Kresko.updateCollateralAsset(info.collateralAsset.address, info.factor, ADDRESS_TWO);

                const asset = await this.Kresko.collateralAssets(info.collateralAsset.address);
                expect(asset.oracle).to.equal(ADDRESS_TWO);
            });

            it("should emit CollateralAssetUpdated event", async function () {
                let info = this.collateralAssetInfo;
                const receipt = await this.Kresko.updateCollateralAsset(
                    info.collateralAsset.address,
                    ZERO_POINT_FIVE,
                    ADDRESS_TWO,
                );

                const { args } = await extractEventFromTxReceipt(receipt, "CollateralAssetUpdated");
                expect(args.collateralAsset).to.equal(info.collateralAsset.address);
                expect(args.factor).to.equal(ZERO_POINT_FIVE);
                expect(args.oracle).to.equal(ADDRESS_TWO);
            });

            it("should not allow the collateral factor to be greater than 1", async function () {
                let info = this.collateralAssetInfo;
                await expect(
                    this.Kresko.updateCollateralAsset(info.collateralAsset.address, ONE.add(1), info.oracle.address),
                ).to.be.revertedWith("KR: factor > 1FP");
            });

            it("should not allow the oracle address to be the zero address", async function () {
                let info = this.collateralAssetInfo;
                await expect(
                    this.Kresko.updateCollateralAsset(info.collateralAsset.address, info.factor, ADDRESS_ZERO),
                ).to.be.revertedWith("KR: !oracleAddr");
            });

            it("should not allow non-owner to update collateral asset", async function () {
                let info = this.collateralAssetInfo;
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateCollateralAsset(
                        info.collateralAsset.address,
                        info.factor,
                        info.oracle.address,
                    ),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Account collateral", function () {
        beforeEach(async function () {
            this.initialUserCollateralBalance = 1000;

            this.collateralAssetInfos = (await Promise.all<CollateralAssetInfo>([
                deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18),
                deployAndWhitelistCollateralAsset(this.Kresko, 0.7, 420.123, 12),
                deployAndWhitelistCollateralAsset(this.Kresko, 0.6, 20.123, 24),
            ])) as CollateralAssetInfo[];

            // Give userOne a balance of 1000 for each collateral asset.
            for (const collateralAssetInfo of this.collateralAssetInfos as CollateralAssetInfo[]) {
                await collateralAssetInfo.collateralAsset.setBalanceOf(
                    this.signers.userOne.address,
                    collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                );
            }
        });

        for (const rebasing of [false, true]) {
            describe(`${rebasing ? "Rebasing" : "Non-rebasing"} collateral`, function () {
                beforeEach(async function () {
                    this.initialUserCollateralBalance = 1000;

                    if (rebasing) {
                        this.collateralAssetInfos = await Promise.all([
                            deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18, true),
                            deployAndWhitelistCollateralAsset(this.Kresko, 0.7, 420.123, 18, true),
                            deployAndWhitelistCollateralAsset(this.Kresko, 0.6, 20.123, 18, true),
                        ]);

                        // Give userOne a balance of 1000 for each rebasing (ie underlying) token.
                        for (const collateralAssetInfo of this.collateralAssetInfos) {
                            await collateralAssetInfo.rebasingToken!.setBalanceOf(
                                this.signers.userOne.address,
                                collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                            );
                            // also set approval for Kresko.sol -- virtually infinite for ease of testing
                            await collateralAssetInfo
                                .rebasingToken!.connect(this.signers.userOne)
                                .approve(this.Kresko.address, BigNumber.from(2).pow(256).sub(1));
                        }

                        this.depositFunction = this.Kresko.connect(this.signers.userOne).depositRebasingCollateral;
                    } else {
                        this.depositFunction = this.Kresko.connect(this.signers.userOne).depositCollateral;
                    }
                });

                describe(`#deposit${rebasing ? "Rebasing" : ""}Collateral`, function () {
                    it("should allow an account to deposit whitelisted collateral", async function () {
                        // Initially, the array of the user's deposited collateral assets should be empty.
                        const depositedCollateralAssetsBefore = await this.Kresko.getDepositedCollateralAssets(
                            this.signers.userOne.address,
                        );
                        expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                        const collateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;

                        // Deposit it
                        const depositAmount = collateralAssetInfo.fromDecimal(123.321);
                        await this.depositFunction(
                            this.signers.userOne.address,
                            collateralAsset.address,
                            depositAmount,
                        );

                        // Confirm the array of the user's deposited collateral assets has been pushed to.
                        const depositedCollateralAssetsAfter = await this.Kresko.getDepositedCollateralAssets(
                            this.signers.userOne.address,
                        );
                        expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                        // Confirm the amount deposited is recorded for the user.
                        const amountDeposited = await this.Kresko.collateralDeposits(
                            this.signers.userOne.address,
                            collateralAsset.address,
                        );
                        expect(amountDeposited).to.equal(depositAmount);

                        // Confirm the amount as been transferred from the user into Kresko.sol
                        const kreskoBalance = await collateralAsset.balanceOf(this.Kresko.address);
                        expect(kreskoBalance).to.equal(depositAmount);
                        let userOneBalance: BigNumber;
                        if (rebasing) {
                            userOneBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                this.signers.userOne.address,
                            );
                        } else {
                            userOneBalance = await collateralAsset.balanceOf(this.signers.userOne.address);
                        }
                        expect(userOneBalance).to.equal(
                            collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance).sub(depositAmount),
                        );
                    });

                    it("should allow an arbitrary account to deposit whitelisted collateral on behalf of another account", async function () {
                        const depositor = this.signers.userOne;
                        const arbitraryUser = this.signers.userThree;
                        // Initially, the array of the user's deposited collateral assets should be empty.
                        const depositedCollateralAssetsBefore = await this.Kresko.getDepositedCollateralAssets(
                            depositor.address,
                        );
                        expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                        const collateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;

                        // Deposit it
                        const depositAmount = collateralAssetInfo.fromDecimal(123.321);
                        await this.depositFunction(arbitraryUser.address, collateralAsset.address, depositAmount);

                        // Confirm the array of the user's deposited collateral assets has been pushed to.
                        const depositedCollateralAssetsAfter = await this.Kresko.getDepositedCollateralAssets(
                            arbitraryUser.address,
                        );
                        expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                        // Confirm the amount deposited is recorded for the user.
                        const amountDeposited = await this.Kresko.collateralDeposits(
                            arbitraryUser.address,
                            collateralAsset.address,
                        );
                        expect(amountDeposited).to.equal(depositAmount);

                        // Confirm the amount as been transferred from the user into Kresko.sol
                        const kreskoBalance = await collateralAsset.balanceOf(this.Kresko.address);
                        expect(kreskoBalance).to.equal(depositAmount);

                        // Confirm the depositors (userOne) wallet balance has been adjusted accordingly
                        let depositorBalanceAfter: BigNumber;
                        if (rebasing) {
                            depositorBalanceAfter = await collateralAssetInfo.rebasingToken.balanceOf(
                                depositor.address,
                            );
                        } else {
                            depositorBalanceAfter = await collateralAsset.balanceOf(depositor.address);
                        }
                        expect(depositorBalanceAfter).to.equal(
                            collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance).sub(depositAmount),
                        );
                    });

                    it("should allow an account to deposit more collateral to an existing deposit", async function () {
                        const collateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;

                        // Deposit an initial amount
                        const depositAmount0 = collateralAssetInfo.fromDecimal(123.321);
                        await this.depositFunction(
                            this.signers.userOne.address,
                            collateralAsset.address,
                            depositAmount0,
                        );

                        // Deposit a secound amount
                        const depositAmount1 = collateralAssetInfo.fromDecimal(321.123);
                        await this.depositFunction(
                            this.signers.userOne.address,
                            collateralAsset.address,
                            depositAmount1,
                        );

                        // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                        const depositedCollateralAssetsAfter = await this.Kresko.getDepositedCollateralAssets(
                            this.signers.userOne.address,
                        );
                        expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                        // Confirm the amount deposited is recorded for the user.
                        const amountDeposited = await this.Kresko.collateralDeposits(
                            this.signers.userOne.address,
                            collateralAsset.address,
                        );
                        expect(amountDeposited).to.equal(depositAmount0.add(depositAmount1));
                    });

                    it("should allow an account to have deposited multiple collateral assets", async function () {
                        const [collateralAssetInfo0, collateralAssetInfo1] = this.collateralAssetInfos;
                        const collateralAsset0 = collateralAssetInfo0.collateralAsset;
                        const collateralAsset1 = collateralAssetInfo1.collateralAsset;

                        // Deposit a collateral asset.
                        const depositAmount0 = collateralAssetInfo0.fromDecimal(123.321);
                        await this.depositFunction(
                            this.signers.userOne.address,
                            collateralAsset0.address,
                            depositAmount0,
                        );

                        // Deposit a different collateral asset.
                        const depositAmount1 = collateralAssetInfo1.fromDecimal(321.123);
                        await this.depositFunction(
                            this.signers.userOne.address,
                            collateralAsset1.address,
                            depositAmount1,
                        );

                        // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                        const depositedCollateralAssetsAfter = await this.Kresko.getDepositedCollateralAssets(
                            this.signers.userOne.address,
                        );
                        expect(depositedCollateralAssetsAfter).to.deep.equal([
                            collateralAsset0.address,
                            collateralAsset1.address,
                        ]);
                    });

                    it("should emit CollateralDeposited event", async function () {
                        const collateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;
                        const depositAmount = collateralAssetInfo.fromDecimal(123.321);
                        const receipt = await this.depositFunction(
                            this.signers.userOne.address,
                            collateralAsset.address,
                            depositAmount,
                        );

                        const { args } = await extractEventFromTxReceipt(receipt, "CollateralDeposited");
                        expect(args.account).to.equal(this.signers.userOne.address);
                        expect(args.collateralAsset).to.equal(collateralAsset.address);
                        expect(args.amount).to.equal(depositAmount);
                    });

                    it("should revert if depositing collateral that has not been whitelisted", async function () {
                        await expect(
                            this.depositFunction(this.signers.userOne.address, ADDRESS_ONE, parseEther("123")),
                        ).to.be.revertedWith("KR: !collateralExists");
                    });

                    it("should revert if depositing an amount of 0", async function () {
                        const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                        await expect(
                            this.depositFunction(this.signers.userOne.address, collateralAsset.address, 0),
                        ).to.be.revertedWith(`KR: 0-deposit`);
                    });

                    if (rebasing) {
                        it("should revert if depositing collateral that is not a NonRebasingWrapperToken", async function () {
                            const nonNRWTInfo = await deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18);
                            await expect(
                                this.depositFunction(
                                    this.signers.userOne.address,
                                    nonNRWTInfo.collateralAsset.address,
                                    1,
                                ),
                            ).to.be.revertedWith("KR: !NRWTCollateral");
                        });
                    }
                });

                describe(`#withdraw${rebasing ? "Rebasing" : ""}Collateral`, async function () {
                    beforeEach(async function () {
                        this.initialDepositAmount = 100;

                        // Have userOne deposit 100 of each collateral asset.
                        // This results in an account collateral value of 40491.
                        if (rebasing) {
                            for (const collateralAssetInfo of this.collateralAssetInfos) {
                                await this.Kresko.connect(this.signers.userOne).depositRebasingCollateral(
                                    this.signers.userOne.address,
                                    collateralAssetInfo.collateralAsset.address,
                                    collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                                );
                            }
                            this.withdrawalFunctionUserThree = this.Kresko.connect(
                                this.signers.userThree,
                            ).withdrawRebasingCollateral;

                            this.withdrawalFunction = this.Kresko.connect(
                                this.signers.userOne,
                            ).withdrawRebasingCollateral;
                        } else {
                            for (const collateralAssetInfo of this.collateralAssetInfos) {
                                await this.Kresko.connect(this.signers.userOne).depositCollateral(
                                    this.signers.userOne.address,
                                    collateralAssetInfo.collateralAsset.address,
                                    collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                                );
                            }
                            this.withdrawalFunction = this.Kresko.connect(this.signers.userOne).withdrawCollateral;
                            this.withdrawalFunctionUserThree = this.Kresko.connect(
                                this.signers.userThree,
                            ).withdrawCollateral;
                        }
                    });

                    describe("when the account's minimum collateral value is 0", function () {
                        it("should allow an account to withdraw their entire deposit", async function () {
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            await this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                                0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                            );
                            // Ensure that the collateral asset is removed from the account's deposited collateral
                            // assets array.
                            const depositedCollateralAssets = await this.Kresko.getDepositedCollateralAssets(
                                this.signers.userOne.address,
                            );
                            expect(depositedCollateralAssets).to.deep.equal([
                                // index 2 was moved to index 0 due to the way elements are removed,
                                // which involves copying the last element into the index that's being removed
                                this.collateralAssetInfos[2].collateralAsset.address,
                                this.collateralAssetInfos[1].collateralAsset.address,
                            ]);

                            // Ensure the change in the user's deposit is recorded.
                            const amountDeposited = await this.Kresko.collateralDeposits(
                                this.signers.userOne.address,
                                collateralAsset.address,
                            );
                            expect(amountDeposited).to.equal(0);

                            // Ensure the amount transferred is correct
                            const kreskoBalance = await collateralAsset.balanceOf(this.Kresko.address);
                            expect(kreskoBalance).to.equal(BigNumber.from(0));
                            if (rebasing) {
                                const userOneNRWTBalance = await collateralAsset.balanceOf(
                                    this.signers.userOne.address,
                                );
                                expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                                const userOneRebasingBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                    this.signers.userOne.address,
                                );
                                expect(userOneRebasingBalance).to.equal(
                                    collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                                );
                            } else {
                                const userOneBalance = await collateralAsset.balanceOf(this.signers.userOne.address);
                                expect(userOneBalance).to.equal(
                                    collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                                );
                            }
                        });

                        it("should allow an account to withdraw a portion of their deposit", async function () {
                            const amountToWithdraw = parseEther("49.43");
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;
                            const initialDepositAmount = collateralAssetInfo.fromDecimal(this.initialDepositAmount);

                            await this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                amountToWithdraw,
                                0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                            );

                            // Ensure the change in the user's deposit is recorded.
                            const amountDeposited = await this.Kresko.collateralDeposits(
                                this.signers.userOne.address,
                                collateralAsset.address,
                            );
                            expect(amountDeposited).to.equal(initialDepositAmount.sub(amountToWithdraw));

                            // Ensure that the collateral asset is still in the account's deposited collateral
                            // assets array.
                            const depositedCollateralAssets = await this.Kresko.getDepositedCollateralAssets(
                                this.signers.userOne.address,
                            );
                            expect(depositedCollateralAssets).to.deep.equal([
                                this.collateralAssetInfos[0].collateralAsset.address,
                                this.collateralAssetInfos[1].collateralAsset.address,
                                this.collateralAssetInfos[2].collateralAsset.address,
                            ]);

                            const kreskoBalance = await collateralAsset.balanceOf(this.Kresko.address);
                            expect(kreskoBalance).to.equal(initialDepositAmount.sub(amountToWithdraw));

                            if (rebasing) {
                                const userOneNRWTBalance = await collateralAsset.balanceOf(
                                    this.signers.userOne.address,
                                );
                                expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                                const userOneRebasingBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                    this.signers.userOne.address,
                                );
                                expect(userOneRebasingBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            } else {
                                const kreskoBalance = await collateralAsset.balanceOf(this.Kresko.address);
                                expect(kreskoBalance).to.equal(initialDepositAmount.sub(amountToWithdraw));
                                const userOneBalance = await collateralAsset.balanceOf(this.signers.userOne.address);
                                expect(userOneBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            }
                        });

                        it("should allow trusted address to withdraw another accounts deposit", async function () {
                            const amountToWithdraw = parseEther("10");
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            // Trust userThrees address
                            await this.Kresko.connect(this.signers.admin).toggleTrustedContract(
                                this.signers.userThree.address,
                            );

                            const collateralBefore = await this.Kresko.collateralDeposits(
                                this.signers.userOne.address,
                                collateralAsset.address,
                            );

                            await expect(
                                this.withdrawalFunctionUserThree(
                                    this.signers.userOne.address,
                                    collateralAsset.address,
                                    amountToWithdraw,
                                    0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                                ),
                            ).to.not.be.reverted;

                            const collateralAfter = await this.Kresko.collateralDeposits(
                                this.signers.userOne.address,
                                collateralAsset.address,
                            );
                            // Ensure that collateral was withdrawn
                            expect(collateralAfter).to.equal(collateralBefore.sub(amountToWithdraw));
                        });

                        it("should emit CollateralWithdrawn event", async function () {
                            const amountToWithdraw = parseEther("49.43");
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            const receipt = await this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                amountToWithdraw,
                                0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                            );

                            const { args } = await extractEventFromTxReceipt(receipt, "CollateralWithdrawn");
                            expect(args.account).to.equal(this.signers.userOne.address);
                            expect(args.collateralAsset).to.equal(collateralAsset.address);
                            expect(args.amount).to.equal(amountToWithdraw);
                        });

                        it("should not allow untrusted address to withdraw another accounts deposit", async function () {
                            const amountToWithdraw = parseEther("10");
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            await expect(
                                this.withdrawalFunctionUserThree(
                                    this.signers.userOne.address,
                                    collateralAsset.address,
                                    amountToWithdraw,
                                    0,
                                ),
                            ).to.be.revertedWith("KR: Unauthorized caller");
                        });
                    });

                    describe("when the account's minimum collateral value is > 0", function () {
                        beforeEach(async function () {
                            // Deploy Kresko assets, adding them to the whitelist
                            const kreskoAssetInfo = await addNewKreskoAssetWithOraclePrice(
                                this.Kresko,
                                NAME_TWO,
                                SYMBOL_TWO,
                                1,
                                250,
                                MARKET_CAP_ONE_MILLION,
                            ); // kFactor = 1, price = $250

                            // Mint 100 of the kreskoAsset. This puts the minimum collateral value of userOne as
                            // 250 * 1.5 * 100 = 37,500, which is close to userOne's account collateral value
                            // of 40491.
                            const kreskoAssetMintAmount = parseEther("100");
                            await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                                this.signers.userOne.address,
                                kreskoAssetInfo.kreskoAsset.address,
                                kreskoAssetMintAmount,
                            );
                        });

                        it("should allow an account to withdraw their deposit if it does not violate the health factor", async function () {
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;
                            const initialDepositAmount = collateralAssetInfo.fromDecimal(this.initialDepositAmount);
                            const amountToWithdraw = collateralAssetInfo.fromDecimal(10);

                            // Ensure that the withdrawal would not put the account's collateral value
                            // less than the account's minimum collateral value:
                            const accountMinCollateralValue = await this.Kresko.getAccountMinimumCollateralValue(
                                this.signers.userOne.address,
                            );
                            const accountCollateralValue = await this.Kresko.getAccountCollateralValue(
                                this.signers.userOne.address,
                            );
                            const [withdrawnCollateralValue] = await this.Kresko.getCollateralValueAndOraclePrice(
                                collateralAsset.address,
                                amountToWithdraw,
                                false,
                            );
                            expect(
                                accountCollateralValue.rawValue
                                    .sub(withdrawnCollateralValue.rawValue)
                                    .gte(accountMinCollateralValue.rawValue),
                            ).to.be.true;

                            await this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                amountToWithdraw,
                                0,
                            );
                            // Ensure that the collateral asset is still in the account's deposited collateral
                            // assets array.
                            const depositedCollateralAssets = await this.Kresko.getDepositedCollateralAssets(
                                this.signers.userOne.address,
                            );
                            expect(depositedCollateralAssets).to.deep.equal([
                                this.collateralAssetInfos[0].collateralAsset.address,
                                this.collateralAssetInfos[1].collateralAsset.address,
                                this.collateralAssetInfos[2].collateralAsset.address,
                            ]);

                            // Ensure the change in the user's deposit is recorded.
                            const amountDeposited = await this.Kresko.collateralDeposits(
                                this.signers.userOne.address,
                                collateralAsset.address,
                            );
                            expect(amountDeposited).to.equal(initialDepositAmount.sub(amountToWithdraw));

                            const kreskoBalance = await collateralAsset.balanceOf(this.Kresko.address);
                            expect(kreskoBalance).to.equal(initialDepositAmount.sub(amountToWithdraw));

                            if (rebasing) {
                                const userOneNRWTBalance = await collateralAsset.balanceOf(
                                    this.signers.userOne.address,
                                );
                                expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                                const userOneRebasingBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                    this.signers.userOne.address,
                                );
                                expect(userOneRebasingBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            } else {
                                const userOneBalance = await collateralAsset.balanceOf(this.signers.userOne.address);
                                expect(userOneBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            }

                            // Ensure the account's minimum collateral value is <= the account collateral value
                            // These are FixedPoint.Unsigned, be sure to use `rawValue` when appropriate!
                            const accountMinCollateralValueAfter = await this.Kresko.getAccountMinimumCollateralValue(
                                this.signers.userOne.address,
                            );
                            const accountCollateralValueAfter = await this.Kresko.getAccountCollateralValue(
                                this.signers.userOne.address,
                            );
                            expect(accountMinCollateralValueAfter.rawValue.lte(accountCollateralValueAfter.rawValue)).to
                                .be.true;
                        });

                        it("should revert if the withdrawal violates the health factor", async function () {
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            const amountToWithdraw = collateralAssetInfo.fromDecimal(this.initialDepositAmount);

                            // Ensure that the withdrawal would in fact put the account's collateral value
                            // less than the account's minimum collateral value:
                            const accountMinCollateralValue = await this.Kresko.getAccountMinimumCollateralValue(
                                this.signers.userOne.address,
                            );
                            const accountCollateralValue = await this.Kresko.getAccountCollateralValue(
                                this.signers.userOne.address,
                            );
                            const [withdrawnCollateralValue] = await this.Kresko.getCollateralValueAndOraclePrice(
                                collateralAsset.address,
                                amountToWithdraw,
                                false,
                            );
                            expect(
                                accountCollateralValue.rawValue
                                    .sub(withdrawnCollateralValue.rawValue)
                                    .lt(accountMinCollateralValue.rawValue),
                            ).to.be.true;

                            await expect(
                                this.withdrawalFunction(
                                    this.signers.userOne.address,
                                    collateralAsset.address,
                                    amountToWithdraw,
                                    0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                                ),
                            ).to.be.revertedWith("KR: collateralTooLow");
                        });
                    });

                    it("should revert if withdrawing the entire deposit but the depositedCollateralAssetIndex is incorrect", async function () {
                        const collateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;

                        await expect(
                            this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                                1, // Incorrect index
                            ),
                        ).to.be.revertedWith("Arrays: incorrect removal index");
                    });

                    it("should allow withdraws that exceed deposits and only send the user total deposit available", async function () {
                        const collateralAssetInfo: CollateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;
                        const collateralAssetDecimals = collateralAssetInfo.decimals;

                        const overflowWithdrawAmount = collateralAssetInfo.fromDecimal(
                            this.initialDepositAmount + 10000,
                        );
                        const balanceAfterDeposit = this.initialUserCollateralBalance - this.initialDepositAmount;

                        const kreskoCollateralBalanceBeforeWithdraw = fromBig(
                            await collateralAssetInfo.collateralAsset.balanceOf(this.Kresko.address),
                        );

                        expect(kreskoCollateralBalanceBeforeWithdraw).to.equal(this.initialDepositAmount);

                        if (rebasing) {
                            const userOneNRWTBalance = await collateralAsset.balanceOf(this.signers.userOne.address);
                            expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                            const rebasingTokenDecimals = Number(await collateralAsset.decimals());

                            const userOneRebasingBalanceBeforeWithdraw = fromBig(
                                await collateralAssetInfo.rebasingToken!.balanceOf(this.signers.userOne.address),
                                rebasingTokenDecimals,
                            );

                            expect(userOneRebasingBalanceBeforeWithdraw).to.equal(balanceAfterDeposit);

                            await this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                overflowWithdrawAmount,
                                0,
                            );

                            const userOneRebasingBalanceAfterOverflowWithdraw = fromBig(
                                await collateralAssetInfo.rebasingToken!.balanceOf(this.signers.userOne.address),
                                rebasingTokenDecimals,
                            );

                            expect(userOneRebasingBalanceAfterOverflowWithdraw).to.equal(
                                this.initialUserCollateralBalance,
                            );

                            const kreskoNRWTbalanceAfterOverflowWithdraw = fromBig(
                                await collateralAssetInfo.collateralAsset.balanceOf(this.Kresko.address),
                                collateralAssetDecimals,
                            );
                            expect(kreskoNRWTbalanceAfterOverflowWithdraw).to.equal(0);
                        } else {
                            const accountBalanceBeforeOverflowWithdrawal = fromBig(
                                await collateralAsset.balanceOf(this.signers.userOne.address),
                                collateralAssetDecimals,
                            );

                            expect(accountBalanceBeforeOverflowWithdrawal).to.equal(balanceAfterDeposit);

                            await this.withdrawalFunction(
                                this.signers.userOne.address,
                                collateralAsset.address,
                                overflowWithdrawAmount,
                                0,
                            );

                            const userOneBalanceAfterOverflowWithdraw = fromBig(
                                await collateralAsset.balanceOf(this.signers.userOne.address),
                                collateralAssetDecimals,
                            );

                            expect(userOneBalanceAfterOverflowWithdraw).to.equal(this.initialUserCollateralBalance);

                            const kreskoCollateralBalanceAfterOverflowWithdraw = fromBig(
                                await collateralAsset.balanceOf(this.Kresko.address),
                                collateralAssetDecimals,
                            );

                            expect(kreskoCollateralBalanceAfterOverflowWithdraw).to.equal(0);
                        }
                    });

                    it("should revert if withdrawing an amount of 0", async function () {
                        const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                        await expect(
                            this.withdrawalFunction(this.signers.userOne.address, collateralAsset.address, 0, 0),
                        ).to.be.revertedWith("KR: 0-withdraw");
                    });

                    if (rebasing) {
                        it("should revert if depositing collateral that is not a NonRebasingWrapperToken", async function () {
                            const nonNRWTInfo = await deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18);
                            // Give 1000 to userOne
                            await nonNRWTInfo.collateralAsset.setBalanceOf(
                                this.signers.userOne.address,
                                nonNRWTInfo.fromDecimal(this.initialUserCollateralBalance),
                            );
                            // Have userOne deposit 100 of the collateral asset.
                            await this.Kresko.connect(this.signers.userOne).depositCollateral(
                                this.signers.userOne.address,
                                nonNRWTInfo.collateralAsset.address,
                                nonNRWTInfo.fromDecimal(this.initialDepositAmount),
                            );
                            await expect(
                                this.withdrawalFunction(
                                    this.signers.userOne.address,
                                    nonNRWTInfo.collateralAsset.address,
                                    1,
                                    0,
                                ),
                            ).to.be.revertedWith("KR: !NRWTCollateral");
                        });
                    }
                });
            });
        }

        describe("#getAccountCollateralValue", async function () {
            beforeEach(async function () {
                // Have userOne deposit 100 of each collateral asset
                this.initialDepositAmount = BigNumber.from(100);
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    await this.Kresko.connect(this.signers.userOne).depositCollateral(
                        this.signers.userOne.address,
                        collateralAssetInfo.collateralAsset.address,
                        collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                    );
                }
            });

            it("returns the account collateral value according to a user's deposits and their oracle prices", async function () {
                let expectedCollateralValue = BigNumber.from(0);
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    expectedCollateralValue = expectedCollateralValue.add(
                        fixedPointMul(
                            fixedPointMul(toFixedPoint(this.initialDepositAmount), collateralAssetInfo.oraclePrice),
                            collateralAssetInfo.factor,
                        ),
                    );
                }

                const collateralValue = await this.Kresko.getAccountCollateralValue(this.signers.userOne.address);
                expect(collateralValue.rawValue).to.equal(expectedCollateralValue);
            });

            it("returns 0 if the user has not deposited any collateral", async function () {
                const collateralValue = await this.Kresko.getAccountCollateralValue(this.signers.userTwo.address);
                expect(collateralValue.rawValue).to.equal(BigNumber.from(0));
            });
        });
    });

    describe("Kresko Assets", function () {
        async function deployAndAddKreskoAsset(
            this: any,
            name: string,
            symbol: string,
            kFactor: BigNumber,
            oracleAddress: string,
            marketCapUSDLimit: BigNumber,
        ) {
            const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
            const kreskoAsset = <KreskoAsset>await (
                await hre.upgrades.deployProxy(
                    kreskoAssetFactory,
                    [name, symbol, this.signers.admin.address, this.Kresko.address],
                    {
                        unsafeAllow: ["constructor"],
                    },
                )
            ).deployed();
            await this.Kresko.addKreskoAsset(kreskoAsset.address, symbol, kFactor, oracleAddress, marketCapUSDLimit);
            return kreskoAsset;
        }

        beforeEach(async function () {
            this.deployAndAddKreskoAsset = deployAndAddKreskoAsset.bind(this);

            const kreskoAssetInfo = await addNewKreskoAssetWithOraclePrice(
                this.Kresko,
                NAME_ONE,
                SYMBOL_ONE,
                1,
                1,
                MARKET_CAP_ONE_MILLION,
            );
            this.deployedAssetAddress = kreskoAssetInfo.kreskoAsset.address;
        });

        describe("#addKreskoAsset", function () {
            it("should allow owner to add new kresko assets and emit event KreskoAssetAdded", async function () {
                const deployedKreskoAsset = await this.deployAndAddKreskoAsset(
                    NAME_TWO,
                    SYMBOL_TWO,
                    ONE,
                    ADDRESS_TWO,
                    MARKET_CAP_ONE_MILLION,
                );
                const kreskoAssetInfo = await this.Kresko.kreskoAssets(deployedKreskoAsset.address);
                expect(kreskoAssetInfo.kFactor.rawValue).to.equal(ONE.toString());
                expect(kreskoAssetInfo.oracle).to.equal(ADDRESS_TWO);
                expect(kreskoAssetInfo.marketCapUSDLimit).to.equal(MARKET_CAP_ONE_MILLION);
            });

            it("should not allow adding kresko asset that does not have Kresko as operator", async function () {
                const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
                const kreskoAsset = <KreskoAsset>await (
                    await hre.upgrades.deployProxy(
                        kreskoAssetFactory,
                        ["TEST", "TEST2", this.signers.admin.address, this.signers.userTwo.address],
                        {
                            unsafeAllow: ["constructor"],
                        },
                    )
                ).deployed();

                await expect(
                    this.Kresko.addKreskoAsset(kreskoAsset.address, "TEST2", ONE, ADDRESS_TWO, MARKET_CAP_ONE_MILLION),
                ).to.be.revertedWith("KR: !assetOperator");
            });

            it("should not allow kresko assets that have the same symbol as an existing kresko asset", async function () {
                await expect(
                    this.Kresko.addKreskoAsset(ADDRESS_ONE, SYMBOL_ONE, ONE, ADDRESS_TWO, MARKET_CAP_ONE_MILLION),
                ).to.be.revertedWith("KR: symbolExists");
            });

            it("should not allow kresko assets with invalid asset symbol", async function () {
                await expect(
                    this.Kresko.addKreskoAsset(ADDRESS_ONE, "", ONE, ADDRESS_TWO, MARKET_CAP_ONE_MILLION),
                ).to.be.revertedWith("KR: !string");
            });

            it("should not allow kresko assets with an invalid k factor", async function () {
                await expect(
                    this.Kresko.addKreskoAsset(
                        ADDRESS_ONE,
                        SYMBOL_TWO,
                        ONE.sub(1),
                        ADDRESS_TWO,
                        MARKET_CAP_ONE_MILLION,
                    ),
                ).to.be.revertedWith("KR: kFactor < 1FP");
            });

            it("should not allow kresko assets with an invalid oracle address", async function () {
                await expect(
                    this.Kresko.addKreskoAsset(ADDRESS_ONE, SYMBOL_TWO, ONE, ADDRESS_ZERO, MARKET_CAP_ONE_MILLION),
                ).to.be.revertedWith("KR: !oracleAddr");
            });

            it("should not allow non-owner to add assets", async function () {
                await expect(
                    this.Kresko.connect(this.signers.userOne).addKreskoAsset(
                        ADDRESS_ONE,
                        SYMBOL_TWO,
                        ONE,
                        ADDRESS_TWO,
                        MARKET_CAP_ONE_MILLION,
                    ),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateKreskoAsset", function () {
            it("should allow owner to update kresko asset k-factor", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await this.Kresko.updateKreskoAsset(
                    this.deployedAssetAddress,
                    ONE,
                    asset.oracle,
                    asset.mintable,
                    asset.marketCapUSDLimit,
                );

                const updatedAsset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                expect(updatedAsset.kFactor.rawValue).to.equal(ONE.toString());
            });

            it("should allow owner to update kresko asset oracle address", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await this.Kresko.updateKreskoAsset(
                    this.deployedAssetAddress,
                    asset.kFactor.rawValue,
                    ADDRESS_TWO,
                    asset.mintable,
                    asset.marketCapUSDLimit,
                );

                const updatedAsset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                expect(updatedAsset.oracle).to.equal(ADDRESS_TWO);
            });

            it("should allow owner to update kresko asset mintable property", async function () {
                // Expect mintable to be true first
                expect((await this.Kresko.kreskoAssets(this.deployedAssetAddress)).mintable).to.equal(true);

                // Set it to false
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await this.Kresko.updateKreskoAsset(
                    this.deployedAssetAddress,
                    asset.kFactor.rawValue,
                    asset.oracle,
                    false,
                    asset.marketCapUSDLimit,
                );

                // Expect mintable to be false now
                expect((await this.Kresko.kreskoAssets(this.deployedAssetAddress)).mintable).to.equal(false);

                // Set it to true
                await this.Kresko.updateKreskoAsset(
                    this.deployedAssetAddress,
                    asset.kFactor.rawValue,
                    asset.oracle,
                    true,
                    asset.marketCapUSDLimit,
                );

                // Expect mintable to be true now
                expect((await this.Kresko.kreskoAssets(this.deployedAssetAddress)).mintable).to.equal(true);
            });

            it("should allow owner to update market capitalization USD limit", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await this.Kresko.updateKreskoAsset(
                    this.deployedAssetAddress,
                    asset.kFactor.rawValue,
                    asset.oracle,
                    asset.mintable,
                    MARKET_CAP_FIVE_MILLION,
                );

                const updatedAsset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                expect(updatedAsset.marketCapUSDLimit).to.equal(MARKET_CAP_FIVE_MILLION);
            });

            it("should emit KreskoAssetUpdated event", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                const receipt = await this.Kresko.updateKreskoAsset(
                    this.deployedAssetAddress,
                    ONE,
                    asset.oracle,
                    asset.mintable,
                    asset.marketCapUSDLimit,
                );

                const { args } = await extractEventFromTxReceipt(receipt, "KreskoAssetUpdated");
                expect(args.kreskoAsset).to.equal(this.deployedAssetAddress);
                expect(args.kFactor).to.equal(ONE);
                expect(args.oracle).to.equal(asset.oracle);
                expect(args.mintable).to.equal(asset.mintable);
                expect(args.limit).to.equal(asset.marketCapUSDLimit);
            });

            it("should not allow a kresko asset's k-factor to be less than 1", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await expect(
                    this.Kresko.updateKreskoAsset(
                        this.deployedAssetAddress,
                        ONE.sub(1),
                        asset.oracle,
                        asset.mintable,
                        asset.marketCapUSDLimit,
                    ),
                ).to.be.revertedWith("KR: kFactor < 1FP");
            });

            it("should not allow a kresko asset's oracle address to be the zero address", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await expect(
                    this.Kresko.updateKreskoAsset(
                        this.deployedAssetAddress,
                        asset.kFactor.rawValue,
                        ADDRESS_ZERO,
                        asset.mintable,
                        asset.marketCapUSDLimit,
                    ),
                ).to.be.revertedWith("KR: !oracleAddr");
            });

            it("should not allow non-owner to update kresko asset", async function () {
                const asset = await this.Kresko.kreskoAssets(this.deployedAssetAddress);
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateKreskoAsset(
                        this.deployedAssetAddress,
                        ONE,
                        asset.oracle,
                        asset.mintable,
                        asset.marketCapUSDLimit,
                    ),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Kresko asset minting and burning", function () {
        beforeEach(async function () {
            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetInfos = await Promise.all([
                addNewKreskoAssetWithOraclePrice(this.Kresko, NAME_ONE, SYMBOL_ONE, 1, 5, MARKET_CAP_ONE_MILLION), // kFactor = 1, price = $5.00
                addNewKreskoAssetWithOraclePrice(this.Kresko, NAME_TWO, SYMBOL_TWO, 1.1, 500, MARKET_CAP_ONE_MILLION), // kFactor = 1.1, price = $500
            ]);

            // Deploy and whitelist collateral assets
            this.collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 123.45, 18);
            // Give userOne a balance of 1000 for the collateral asset.
            this.initialUserCollateralBalance = parseEther("1000");
            await this.collateralAssetInfo.collateralAsset.setBalanceOf(
                this.signers.userOne.address,
                this.initialUserCollateralBalance,
            );

            // Give userThree a balance of 1000 for the collateral asset.
            await this.collateralAssetInfo.collateralAsset.setBalanceOf(
                this.signers.userThree.address,
                this.initialUserCollateralBalance,
            );
            // userOne deposits 100 of the collateral asset.
            // This gives an account collateral value of:
            // 100 * 0.8 * 123.45 = 9,876
            this.collateralDepositAmount = parseEther("100");
            await this.Kresko.connect(this.signers.userOne).depositCollateral(
                this.signers.userOne.address,
                this.collateralAssetInfo.collateralAsset.address,
                this.collateralDepositAmount,
            );
            await this.Kresko.connect(this.signers.userThree).depositCollateral(
                this.signers.userThree.address,
                this.collateralAssetInfo.collateralAsset.address,
                this.collateralDepositAmount,
            );
        });

        describe("#mintKreskoAsset", function () {
            it("should allow users to mint whitelisted Kresko assets backed by collateral", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toFixedPoint(500);
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    mintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMinted = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );
                expect(amountMinted).to.equal(mintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalance = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalance).to.equal(mintAmount);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.add(mintAmount));
            });

            it("should allow successive, valid mints of the same Kresko asset", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = toFixedPoint(50);
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    firstMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                // Mint Kresko asset
                const secondMintAmount = toFixedPoint(70);
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    secondMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets is unchanged
                const mintedKreskoAssetsFinal = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([kreskoAssetAddress]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedFinal = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );
                expect(amountMintedFinal).to.equal(firstMintAmount.add(secondMintAmount));

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedFinal);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyFinal = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyFinal).to.equal(kreskoAssetTotalSupplyAfter.add(secondMintAmount));
            });

            it("should allow users to mint multiple different Kresko assets", async function () {
                const firstKreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const firstKreskoAssetAddress = firstKreskoAsset.address;

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await firstKreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = toFixedPoint(10);
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    firstKreskoAssetAddress,
                    firstMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([firstKreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    firstKreskoAssetAddress,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await firstKreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await firstKreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                const secondKreskoAsset = this.kreskoAssetInfos[1].kreskoAsset;
                const secondKreskoAssetAddress = secondKreskoAsset.address;

                // Mint Kresko asset
                const secondMintAmount = toFixedPoint(5);
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    secondKreskoAssetAddress,
                    secondMintAmount,
                );

                // Confirm that the second address has been pushed to the array of the user's minted Kresko assets
                const mintedKreskoAssetsFinal = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([firstKreskoAssetAddress, secondKreskoAssetAddress]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedAssetTwo = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    secondKreskoAssetAddress,
                );
                expect(amountMintedAssetTwo).to.equal(secondMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await secondKreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedAssetTwo);

                // Confirm that the Kresko asset's total supply increased as expected
                const secondKreskoAssetTotalSupply = await secondKreskoAsset.totalSupply();
                expect(secondKreskoAssetTotalSupply).to.equal(secondMintAmount);
            });

            it("should allow users to mint Kresko assets with USD value equal to the minimum debt value", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Confirm that the user does not have an existing debt position for this Kresko asset
                const initialKreskoAssetDebt = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );
                expect(initialKreskoAssetDebt).to.equal(0);

                // Confirm that the mint amount's USD value is equal to the contract's current minimum debt value
                const mintAmount = toFixedPoint(2);
                const mintAmountUSDValue = await this.Kresko.getKrAssetValue(
                    kreskoAssetAddress,
                    String(mintAmount),
                    false,
                );
                const currMinimumDebtValue = await this.Kresko.minimumDebtValue();
                expect(Number(mintAmountUSDValue)).to.be.equal(Number(currMinimumDebtValue));

                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    mintAmount,
                );

                // Confirm that the mint was successful and user's balances have increased
                const finalKreskoAssetDebt = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );
                expect(finalKreskoAssetDebt).to.equal(mintAmount);
            });

            it("should allow trusted address to mint kreskoassets on behalf of another user", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Toggle userThree as trusted "contract"
                await this.Kresko.connect(this.signers.admin).toggleTrustedContract(this.signers.userThree.address);

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toFixedPoint(500);

                // userThree (trusted contract) mints for userOne
                await this.Kresko.connect(this.signers.userThree).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    mintAmount,
                );
                // Check that debt exists now for userOne
                const userOneDebtFromUserThreeMint = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );

                expect(userOneDebtFromUserThreeMint).to.equal(mintAmount);
            });

            it("should emit KreskoAssetMinted event", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const mintAmount = toFixedPoint(500);
                const receipt = await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    mintAmount,
                );

                const { args } = await extractEventFromTxReceipt(receipt, "KreskoAssetMinted");
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.kreskoAsset).to.equal(kreskoAssetAddress);
                expect(args.amount).to.equal(mintAmount);
            });

            it("should not allow untrusted account to mint kreskoassets on behalf of another user", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toFixedPoint(500);
                await expect(
                    this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                        this.signers.userTwo.address,
                        kreskoAssetAddress,
                        mintAmount,
                    ),
                ).to.be.revertedWith("KR: Unauthorized caller");
            });

            it("should not allow users to mint Kresko assets if the resulting position's USD value is less than the minimum debt value", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Confirm that the user does not have an existing debt position for this Kresko asset
                const initialKreskoAssetDebt = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                );
                expect(initialKreskoAssetDebt).to.equal(0);

                // Confirm that the mint amount's USD value is below the contract's current minimum debt value
                const mintAmount = toFixedPoint(1);
                const mintAmountUSDValue = await this.Kresko.getKrAssetValue(
                    kreskoAssetAddress,
                    String(mintAmount),
                    false,
                );
                const currMinimumDebtValue = await this.Kresko.minimumDebtValue();
                expect(Number(mintAmountUSDValue)).to.be.lessThan(Number(currMinimumDebtValue));

                await expect(
                    this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetAddress,
                        mintAmount,
                    ),
                ).to.be.revertedWith("KR: belowMinDebtValue");
            });

            it("should not allow users to mint non-whitelisted Kresko assets", async function () {
                // Attempt to mint a non-deployed, non-whitelisted Kresko asset
                await expect(
                    this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                        this.signers.userOne.address,
                        ADDRESS_TWO,
                        toFixedPoint(50),
                    ),
                ).to.be.revertedWith("KR: !krAssetExist");
            });

            it("should not allow users to mint Kresko assets over their collateralization ratio limit", async function () {
                // The account collateral value is 9,876
                // Attempt to mint an amount that would put the account's min collateral value
                // above that.
                // Minting 1335 of the krAsset at index 0 will give a min collateral
                // value of 1335 * 1 * 5 * 1.5 = 10,012.5
                const mintAmount = parseEther("1335");
                await expect(
                    this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                        this.signers.userOne.address,
                        this.kreskoAssetInfos[0].kreskoAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith("KR: insufficientCollateral");
            });

            it("should not allow the minting of a Kresko assets over its maximum market capitalization USD limit", async function () {
                // Load userTwo's account with 10 million collateral tokens
                const initialUserCollateralBalance = parseEther("10000000");
                await this.collateralAssetInfo.collateralAsset.setBalanceOf(
                    this.signers.userTwo.address,
                    initialUserCollateralBalance,
                );

                // userTwo deposits 1,000,000 of the collateral asset.
                // This gives an account collateral value of:
                // 1,000,000 * 0.8 * $123.45 = $98,760,000
                const collateralDepositAmount = parseEther("1000000");
                await this.Kresko.connect(this.signers.userTwo).depositCollateral(
                    this.signers.userTwo.address,
                    this.collateralAssetInfo.collateralAsset.address,
                    collateralDepositAmount,
                );

                // Limit = $1 million USD. At $5 each, 200,000 of this synthetic can be minted
                const mintAmount = parseEther("200001");
                await expect(
                    this.Kresko.connect(this.signers.userTwo).mintKreskoAsset(
                        this.signers.userTwo.address,
                        this.kreskoAssetInfos[0].kreskoAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith("KR: MC limit");
            });
        });

        describe("#burnKreskoAsset", function () {
            beforeEach(async function () {
                // Mint Kresko asset
                this.mintAmount = toFixedPoint(500);
                await this.Kresko.connect(this.signers.admin).toggleTrustedContract(this.signers.userOne.address);

                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    this.kreskoAssetInfos[0].kreskoAsset.address,
                    this.mintAmount,
                );

                await this.Kresko.connect(this.signers.userThree).mintKreskoAsset(
                    this.signers.userThree.address,
                    this.kreskoAssetInfos[0].kreskoAsset.address,
                    this.mintAmount,
                );
            });

            it("should allow users to burn some of their Kresko asset balances", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();

                // Burn Kresko asset
                const burnAmount = toFixedPoint(200);
                const kreskoAssetIndex = 0;
                await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    burnAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalance).to.equal(this.mintAmount.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAssetAddress);
                expect(userDebt).to.equal(this.mintAmount.sub(burnAmount));
            });

            it("should allow trusted address to burn its own Kresko asset balances on behalf of another user", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();

                await this.Kresko.connect(this.signers.admin).toggleTrustedContract(this.signers.userThree.address);

                // Burn Kresko asset
                const burnAmount = toFixedPoint(200);
                const kreskoAssetIndex = 0;

                // User three burns it's KreskoAsset to reduce userOnes debt
                await expect(
                    this.Kresko.connect(this.signers.userThree).burnKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetAddress,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.not.be.reverted;

                // Confirm the userOne had no effect on it's kreskoAsset balance
                const userOneBalance = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userOneBalance).to.equal(this.mintAmount);

                // Confirm the userThree no long holds the burned Kresko asset amount
                const userThreeBalance = await kreskoAsset.balanceOf(this.signers.userThree.address);
                expect(userThreeBalance).to.equal(this.mintAmount.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the user's minted kresko asset amount has been updated
                const userOneDebt = await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAssetAddress);
                expect(userOneDebt).to.equal(this.mintAmount.sub(burnAmount));
            });

            it("should allow trusted address to burn the full balance of it's Kresko asset on behalf another user", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();
                await this.Kresko.connect(this.signers.admin).toggleTrustedContract(this.signers.userThree.address);

                // User three burns the whole mintAmount of Kresko asset to repay userOne's debt
                const kreskoAssetIndex = 0;
                await this.Kresko.connect(this.signers.userThree).burnKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    this.mintAmount,
                    kreskoAssetIndex,
                );

                // Confirm the userOne holds the initial minted amount of Kresko assets
                const userOneBalance = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userOneBalance).to.equal(this.mintAmount);

                const userThreeBalance = await kreskoAsset.balanceOf(this.signers.userThree.address);
                expect(userThreeBalance).to.equal(0);

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));

                // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([]);

                // Confirm the user's minted kresko asset amount has been updated
                const userOneDebt = await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAssetAddress);
                expect(userOneDebt).to.equal(0);
            });

            it("should allow users to burn their full balance of a Kresko asset", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();

                // Burn Kresko asset
                const kreskoAssetIndex = 0;
                await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    this.mintAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalance).to.equal(0);

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));

                // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAssetAddress);
                expect(userDebt).to.equal(0);
            });

            it("should burn up to the minimum debt position amount if the requested burn would result in a position under the minimum debt value", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const userBalanceBefore = await kreskoAsset.balanceOf(this.signers.userOne.address);
                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();

                // Calculate actual burn amount
                const requestedBurnAmount: number = this.mintAmount.sub(toFixedPoint(1));
                const userOneDebt = Number(
                    await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAssetAddress),
                );
                const krAssetValue = await this.Kresko.getKrAssetValue(
                    kreskoAssetAddress,
                    String(userOneDebt - requestedBurnAmount),
                    true,
                );

                let burnAmount = requestedBurnAmount;
                const krAssetValueNum = Number(krAssetValue.rawValue);
                const minDebtValue = Number(await this.Kresko.minimumDebtValue());
                if (krAssetValueNum > 0 && krAssetValueNum < minDebtValue) {
                    const oraclePrice = Number(await this.kreskoAssetInfos[0].oracle.latestAnswer());
                    burnAmount = userOneDebt - minDebtValue * oraclePrice;
                }

                // Burn Kresko asset
                const kreskoAssetIndex = 0;
                await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    requestedBurnAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user holds the expected Kresko asset amount
                const userBalance = await kreskoAsset.balanceOf(this.signers.userOne.address);
                expect(userBalance).to.equal(userBalanceBefore - burnAmount);

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = Number(await kreskoAsset.totalSupply());
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await this.Kresko.getMintedKreskoAssets(this.signers.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await Number(
                    this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAssetAddress),
                );
                expect(userDebt).to.equal(userOneDebt - burnAmount);
            });

            it("should emit KreskoAssetBurned event", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;
                const receipt = await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    this.mintAmount,
                    kreskoAssetIndex,
                );

                const { args } = await extractEventFromTxReceipt<KreskoAssetBurnedEvent>(receipt, "KreskoAssetBurned");
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.kreskoAsset).to.equal(kreskoAssetAddress);
                expect(args.amount).to.equal(this.mintAmount);
            });

            it("should not allow users to burn an amount of 0", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;

                await expect(
                    this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetAddress,
                        0,
                        kreskoAssetIndex,
                    ),
                ).to.be.revertedWith("KR: 0-burn");
            });

            it("should not allow untrusted address to burn any kresko assets on behalf of another user", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;

                await expect(
                    this.Kresko.connect(this.signers.userThree).burnKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetAddress,
                        100,
                        kreskoAssetIndex,
                    ),
                ).to.be.revertedWith("KR: Unauthorized caller");
            });

            it("should not allow users to burn more kresko assets than they hold as debt", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;
                const burnAmount = this.mintAmount.add(1);

                await expect(
                    this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetAddress,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.be.reverted;
            });

            it("should allow users to burn Kresko assets without giving token approval to Kresko.sol contract", async function () {
                const secondMintAmount = 1;
                const burnAmount = this.mintAmount.add(secondMintAmount);
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;

                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    secondMintAmount,
                );

                const kreskoAssetIndex = 0;

                const receipt = await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAssetAddress,
                    burnAmount,
                    kreskoAssetIndex,
                );

                const { args } = await extractEventFromTxReceipt(receipt, "KreskoAssetBurned");
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.kreskoAsset).to.equal(kreskoAssetAddress);
                expect(args.amount).to.equal(burnAmount);
            });

            describe("Protocol burn fee", async function () {
                const singleFeePaymentTest = async function (
                    this: Mocha.Context,
                    collateralAssetInfo: CollateralAssetInfo,
                ) {
                    const kreskoAssetIndex = 0;
                    const kreskoAssetInfo = this.kreskoAssetInfos[kreskoAssetIndex];

                    const burnAmount = toFixedPoint(200);
                    const burnValue = fixedPointMul(kreskoAssetInfo.oraclePrice, burnAmount);

                    const expectedFeeValue = fixedPointMul(burnValue, BURN_FEE);
                    const expectedCollateralFeeAmount = collateralAssetInfo.fromFixedPoint(
                        fixedPointDiv(expectedFeeValue, collateralAssetInfo.oraclePrice),
                    );

                    // Get the balances prior to the fee being charged.
                    const kreskoCollateralAssetBalanceBefore = await collateralAssetInfo.collateralAsset.balanceOf(
                        this.Kresko.address,
                    );
                    const feeRecipientCollateralAssetBalanceBefore =
                        await collateralAssetInfo.collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS);

                    const burnReceipt = await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetInfo.kreskoAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    );

                    // Get the balances after the fees have been charged.
                    const kreskoCollateralAssetBalanceAfter = await collateralAssetInfo.collateralAsset.balanceOf(
                        this.Kresko.address,
                    );
                    const feeRecipientCollateralAssetBalanceAfter = await collateralAssetInfo.collateralAsset.balanceOf(
                        FEE_RECIPIENT_ADDRESS,
                    );

                    // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected.
                    const feeRecipientBalanceIncrease = feeRecipientCollateralAssetBalanceAfter.sub(
                        feeRecipientCollateralAssetBalanceBefore,
                    );
                    expect(kreskoCollateralAssetBalanceBefore.sub(kreskoCollateralAssetBalanceAfter)).to.equal(
                        feeRecipientBalanceIncrease,
                    );
                    expect(feeRecipientBalanceIncrease).to.equal(expectedCollateralFeeAmount);

                    // Ensure the emitted event is as expected.
                    const events = await extractEventsFromTxReceipt<BurnFeePaidEvent>(burnReceipt, "BurnFeePaid");
                    expect(events.length).to.equal(1);
                    const { args } = events[0];
                    expect(args.account).to.equal(this.signers.userOne.address);
                    expect(args.paymentCollateralAsset).to.equal(collateralAssetInfo.collateralAsset.address);
                    expect(args.paymentAmount).to.equal(expectedCollateralFeeAmount);
                    expect(args.paymentValue).to.equal(expectedFeeValue);
                };

                const atypicalCollateralDecimalsTest = async function (this: Mocha.Context, decimals: number) {
                    const collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.Kresko, 0.8, 10, decimals);
                    // Give userOne a balance for the collateral asset.
                    await collateralAssetInfo.collateralAsset.setBalanceOf(
                        this.signers.userOne.address,
                        collateralAssetInfo.fromDecimal(1000),
                    );
                    await this.Kresko.connect(this.signers.userOne).depositCollateral(
                        this.signers.userOne.address,
                        collateralAssetInfo.collateralAsset.address,
                        collateralAssetInfo.fromDecimal(100),
                    );

                    await singleFeePaymentTest.bind(this)(collateralAssetInfo);
                };

                it("should charge the protocol burn fee with a single collateral asset if the deposit amount is sufficient and emit BurnFeePaid event", async function () {
                    await singleFeePaymentTest.bind(this)(this.collateralAssetInfo);
                });

                it("should charge the protocol burn fee across multiple collateral assets if needed", async function () {
                    const price = 10;
                    // Deploy and whitelist collateral assets
                    const collateralAssetInfos = await Promise.all([
                        deployAndWhitelistCollateralAsset(this.Kresko, 0.8, price, 18),
                        deployAndWhitelistCollateralAsset(this.Kresko, 0.8, price, 18),
                    ]);

                    const smallDepositAmount = parseEther("0.1");
                    const smallDepositValue = smallDepositAmount.mul(price);

                    // Deposit a small amount of the new collateralAssetInfos.
                    for (const collateralAssetInfo of collateralAssetInfos) {
                        // Give userOne a balance for the collateral asset.
                        await collateralAssetInfo.collateralAsset.setBalanceOf(
                            this.signers.userOne.address,
                            this.initialUserCollateralBalance,
                        );

                        await this.Kresko.connect(this.signers.userOne).depositCollateral(
                            this.signers.userOne.address,
                            collateralAssetInfo.collateralAsset.address,
                            smallDepositAmount,
                        );
                    }

                    const allCollateralAssetInfos = [this.collateralAssetInfo, ...collateralAssetInfos];

                    // Now test:

                    const kreskoAssetIndex = 0;
                    const kreskoAssetInfo = this.kreskoAssetInfos[kreskoAssetIndex];

                    const burnAmount = toFixedPoint(200);
                    const burnValue = fixedPointMul(kreskoAssetInfo.oraclePrice, burnAmount);
                    const expectedFeeValue = fixedPointMul(burnValue, BURN_FEE);

                    const getCollateralAssetBalances = () =>
                        Promise.all(
                            allCollateralAssetInfos.map(async info => ({
                                kreskoBalance: await info.collateralAsset.balanceOf(this.Kresko.address),
                                feeRecipientBalance: await info.collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS),
                            })),
                        );

                    // Get the balances prior to the fee being charged.
                    const collateralAssetBalancesBefore = await getCollateralAssetBalances();

                    const burnReceipt = await this.Kresko.connect(this.signers.userOne).burnKreskoAsset(
                        this.signers.userOne.address,
                        kreskoAssetInfo.kreskoAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    );

                    // Get the balances after the fee has been charged.
                    const collateralAssetBalancesAfter = await getCollateralAssetBalances();

                    const events = await extractEventsFromTxReceipt<BurnFeePaidEvent>(burnReceipt, "BurnFeePaid");

                    // Burn fees are charged against collateral assets in reverse order of the user's
                    // deposited collateral assets array. In other words, collateral assets will be tried
                    // in order of the most recently deposited for the first time -> oldest.
                    // We expect 3 BurnFeePaid events because the first 2 collateral deposits have a value
                    // of $1 and will be taken in their entirety, and the remainder of the fee will be taken
                    // from the large deposit amount of the the very first collateral asset.
                    expect(events.length).to.equal(3);

                    const expectFeePaid = (
                        eventArgs: Result,
                        collateralAssetInfoIndex: number,
                        paymentAmount: BigNumber,
                        paymentValue: BigNumber,
                    ) => {
                        // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected.
                        const feeRecipientBalanceBefore =
                            collateralAssetBalancesBefore[collateralAssetInfoIndex].feeRecipientBalance;
                        const kreskoBalanceBefore =
                            collateralAssetBalancesBefore[collateralAssetInfoIndex].kreskoBalance;
                        const feeRecipientBalanceAfter =
                            collateralAssetBalancesAfter[collateralAssetInfoIndex].feeRecipientBalance;
                        const kreskoBalanceAfter = collateralAssetBalancesAfter[collateralAssetInfoIndex].kreskoBalance;

                        const feeRecipientBalanceIncrease = feeRecipientBalanceAfter.sub(feeRecipientBalanceBefore);
                        expect(kreskoBalanceBefore.sub(kreskoBalanceAfter)).to.equal(feeRecipientBalanceIncrease);
                        expect(feeRecipientBalanceIncrease).to.equal(paymentAmount);

                        expect(eventArgs.account).to.equal(this.signers.userOne.address);
                        expect(eventArgs.paymentCollateralAsset).to.equal(
                            allCollateralAssetInfos[collateralAssetInfoIndex].collateralAsset.address,
                        );
                        expect(eventArgs.paymentAmount).to.equal(paymentAmount);
                        expect(eventArgs.paymentValue).to.equal(paymentValue);
                    };

                    // Small deposit of the most recently deposited collateral asset
                    expectFeePaid(events[0].args, 2, smallDepositAmount, smallDepositValue);

                    // Small deposit of the second most recently deposited collateral asset
                    expectFeePaid(events[1].args, 1, smallDepositAmount, smallDepositValue);

                    // The remainder from the initial large deposit
                    const expectedPaymentValue = expectedFeeValue.sub(smallDepositValue.mul(2));
                    const expectedPaymentAmount = fixedPointDiv(
                        expectedPaymentValue,
                        this.collateralAssetInfo.oraclePrice,
                    );
                    expectFeePaid(events[2].args, 0, expectedPaymentAmount, expectedPaymentValue);
                });

                it("should charge fees as expected against collateral assets with decimals < 18", async function () {
                    await atypicalCollateralDecimalsTest.bind(this)(8);
                });

                it("should charge fees as expected against collateral assets with decimals > 18", async function () {
                    await atypicalCollateralDecimalsTest.bind(this)(24);
                });
            });
        });
    });

    describe("Global variables", function () {
        describe("#updateMinimumCollateralizationRatio", function () {
            const validMinimumCollateralizationRatio = toFixedPoint(1.51); // 151%
            const invalidMinimumCollateralizationRatio = toFixedPoint(0.99); // 99%

            it("should allow the owner to set the minimum collateralization ratio", async function () {
                expect(await this.Kresko.minimumCollateralizationRatio()).to.equal(MINIMUM_COLLATERALIZATION_RATIO);

                await this.Kresko.connect(this.signers.admin).updateMinimumCollateralizationRatio(
                    validMinimumCollateralizationRatio,
                );

                expect(await this.Kresko.minimumCollateralizationRatio()).to.equal(validMinimumCollateralizationRatio);
            });

            it("should emit MinimumCollateralizationRatioUpdated event", async function () {
                const receipt = await this.Kresko.connect(this.signers.admin).updateMinimumCollateralizationRatio(
                    validMinimumCollateralizationRatio,
                );

                const { args } = await extractEventFromTxReceipt<MinimumCollateralizationRatioUpdatedEvent>(
                    receipt,
                    "MinimumCollateralizationRatioUpdated",
                );
                expect(args.minimumCollateralizationRatio).to.equal(validMinimumCollateralizationRatio);
            });

            it("should not allow the minimum collateralization ratio to be below MIN_MINIMUM_COLLATERALIZATION_RATIO", async function () {
                await expect(
                    this.Kresko.connect(this.signers.admin).updateMinimumCollateralizationRatio(
                        invalidMinimumCollateralizationRatio,
                    ),
                ).to.be.revertedWith("KR: minCollateralRatio < min");
            });

            it("should not allow minimum collateralization ratio to be set by non-owner", async function () {
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateMinimumCollateralizationRatio(
                        validMinimumCollateralizationRatio,
                    ),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateBurnFee", function () {
            const validNewBurnFee = toFixedPoint(0.042);
            it("should allow the owner to update the burn fee", async function () {
                // Ensure it has the expected initial value
                expect(await this.Kresko.burnFee()).to.equal(BURN_FEE);

                await this.Kresko.connect(this.signers.admin).updateBurnFee(validNewBurnFee);

                expect(await this.Kresko.burnFee()).to.equal(validNewBurnFee);
            });

            it("should emit BurnFeeUpdated event", async function () {
                const receipt = await this.Kresko.connect(this.signers.admin).updateBurnFee(validNewBurnFee);

                const { args } = await extractEventFromTxReceipt(receipt, "BurnFeeUpdated");
                expect(args.burnFee).to.equal(validNewBurnFee);
            });

            it("should not allow the burn fee to exceed MAX_BURN_FEE", async function () {
                const newBurnFee = (await this.Kresko.MAX_BURN_FEE()).add(1);
                await expect(this.Kresko.connect(this.signers.admin).updateBurnFee(newBurnFee)).to.be.revertedWith(
                    "KR: burnFee > max",
                );
            });

            it("should not allow the burn fee to be updated by non-owner", async function () {
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateBurnFee(validNewBurnFee),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateFeeRecipient", function () {
            const validFeeRecipient = "0xF00D000000000000000000000000000000000000";
            it("should allow the owner to update the fee recipient", async function () {
                // Ensure it has the expected initial value
                expect(await this.Kresko.feeRecipient()).to.equal(FEE_RECIPIENT_ADDRESS);

                await this.Kresko.connect(this.signers.admin).updateFeeRecipient(validFeeRecipient);

                expect(await this.Kresko.feeRecipient()).to.equal(validFeeRecipient);
            });

            it("should emit UpdateFeeRecipient event", async function () {
                const receipt = await this.Kresko.connect(this.signers.admin).updateFeeRecipient(validFeeRecipient);

                const { args } = await extractEventFromTxReceipt(receipt, "FeeRecipientUpdated");
                expect(args.feeRecipient).to.equal(validFeeRecipient);
            });

            it("should not allow the fee recipient to be the zero address", async function () {
                await expect(
                    this.Kresko.connect(this.signers.admin).updateFeeRecipient(ADDRESS_ZERO),
                ).to.be.revertedWith("KR: !feeRecipient");
            });

            it("should not allow the fee recipient to be updated by non-owner", async function () {
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateFeeRecipient(validFeeRecipient),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateLiquidationIncentive", function () {
            const validLiquidationIncentiveMultiplier = toFixedPoint(1.15);
            it("should allow the owner to update the liquidation incentive", async function () {
                // Ensure it has the expected initial value
                expect(await this.Kresko.liquidationIncentiveMultiplier()).to.equal(LIQUIDATION_INCENTIVE);

                await this.Kresko.connect(this.signers.admin).updateLiquidationIncentiveMultiplier(
                    validLiquidationIncentiveMultiplier,
                );

                expect(await this.Kresko.liquidationIncentiveMultiplier()).to.equal(
                    validLiquidationIncentiveMultiplier,
                );
            });

            it("should emit LiquidationIncentiveMultiplierUpdated event", async function () {
                const receipt = await this.Kresko.connect(this.signers.admin).updateLiquidationIncentiveMultiplier(
                    validLiquidationIncentiveMultiplier,
                );

                const { args } = await extractEventFromTxReceipt<LiquidationIncentiveMultiplierUpdatedEvent>(
                    receipt,
                    "LiquidationIncentiveMultiplierUpdated",
                );

                expect(args.liquidationIncentiveMultiplier).to.equal(validLiquidationIncentiveMultiplier);
            });

            it("should not allow the liquidation incentive to be less than the MIN_LIQUIDATION_INCENTIVE_MULTIPLIER", async function () {
                const newLiquidationIncentiveMultiplier = (
                    await this.Kresko.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER()
                ).sub(1);
                await expect(
                    this.Kresko.connect(this.signers.admin).updateLiquidationIncentiveMultiplier(
                        newLiquidationIncentiveMultiplier,
                    ),
                ).to.be.revertedWith("KR: liqIncentiveMulti < min");
            });

            it("should not allow the liquidation incentive multiplier to exceed MAX_LIQUIDATION_INCENTIVE_MULTIPLIER", async function () {
                const newLiquidationIncentiveMultiplier = (
                    await this.Kresko.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER()
                ).add(1);
                await expect(
                    this.Kresko.connect(this.signers.admin).updateLiquidationIncentiveMultiplier(
                        newLiquidationIncentiveMultiplier,
                    ),
                ).to.be.revertedWith("KR: liqIncentiveMulti > max");
            });

            it("should not allow the liquidation incentive multiplier to be updated by non-owner", async function () {
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateLiquidationIncentiveMultiplier(
                        validLiquidationIncentiveMultiplier,
                    ),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateMinimumDebtValue", function () {
            it("should allow owner to update the minimum debt value", async function () {
                const newMinDebtValue = toFixedPoint(5);
                await this.Kresko.updateMinimumDebtValue(newMinDebtValue);

                const minDebtValue = await this.Kresko.minimumDebtValue();
                expect(minDebtValue).to.equal(newMinDebtValue);
            });

            it("should allow owner to update the minimum debt value to the exact limit", async function () {
                const newMinDebtValue = toFixedPoint(1000);
                await this.Kresko.updateMinimumDebtValue(newMinDebtValue);

                const minDebtValue = await this.Kresko.minimumDebtValue();
                expect(minDebtValue).to.equal(newMinDebtValue);
            });

            it("should emit MinimumDebtValueUpdated event", async function () {
                const newMinDebtValue = toFixedPoint(5);
                const receipt = await this.Kresko.updateMinimumDebtValue(newMinDebtValue);
                const { args } = await extractEventFromTxReceipt(receipt, "MinimumDebtValueUpdated");
                expect(args.minimumDebtValue).to.equal(newMinDebtValue);
            });

            it("should not allow the minimum debt value to be greater than $1,000", async function () {
                const overlimitDebtValue = toFixedPoint(1001);
                await expect(this.Kresko.updateMinimumDebtValue(overlimitDebtValue)).to.be.revertedWith(
                    "KR: debtValue > max",
                );
            });

            it("should not allow non-owner to update the minimum debt value factor", async function () {
                const newMinDebtValue = toFixedPoint(5);
                await expect(
                    this.Kresko.connect(this.signers.userOne).updateMinimumDebtValue(newMinDebtValue),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Liquidations", function () {
        beforeEach(async function () {
            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetInfo = await Promise.all([
                addNewKreskoAssetWithOraclePrice(this.Kresko, NAME_ONE, SYMBOL_ONE, 1, 10, MARKET_CAP_ONE_MILLION), // kFactor = 1, price = $10.00
            ]);
            this.collDecimals = 6;
            // Deploy and whitelist collateral assets
            this.collateralAssetInfos = await Promise.all([
                deployAndWhitelistCollateralAsset(this.Kresko, 1, 20, this.collDecimals), // factor = 1, price = $20.00
            ]);

            // Give userOne and userTwo a balance of 100*10**decimals for each collateral asset.
            const userAddresses = [this.signers.userOne.address, this.signers.userTwo.address];
            const initialUserCollateralBalance = toBig("100", this.collDecimals);
            for (const collateralAssetInfo of this.collateralAssetInfos) {
                for (const userAddress of userAddresses) {
                    await collateralAssetInfo.collateralAsset.setBalanceOf(userAddress, initialUserCollateralBalance);
                }
            }

            // userOne deposits 10 of the collateral asset
            const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
            const userOneDepositAmount = toBig(10, this.collDecimals); // 10 * $20 = $200 in collateral value
            await this.Kresko.connect(this.signers.userOne).depositCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                userOneDepositAmount,
            );

            // userOne mints 10 of the Kresko asset
            const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
            const useOneMintAmount = toFixedPoint(10); // 10 * $10 = $100 in debt value
            await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                this.signers.userOne.address,
                kreskoAsset.address,
                String(useOneMintAmount),
            );

            // userTwo deposits 100 of the collateral asset
            const userTwoDepositAmount = toBig(100, this.collDecimals); // 100 * $20 = $2,000 in collateral value
            await this.Kresko.connect(this.signers.userTwo).depositCollateral(
                this.signers.userTwo.address,
                collateralAsset.address,
                String(userTwoDepositAmount),
            );

            // userTwo mints 10 of the Kresko asset
            const userTwoMintAmount = toFixedPoint(10); // 10 * $10 = $100 in debt value
            await this.Kresko.connect(this.signers.userTwo).mintKreskoAsset(
                this.signers.userTwo.address,
                kreskoAsset.address,
                String(userTwoMintAmount),
            );
        });

        describe("#isAccountLiquidatable", function () {
            it("should identify accounts below their minimum collateralization ratio", async function () {
                // Initial debt value: (10 * $10) = $100
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const userDebtAmount = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                );
                const userDebtAmountInUSD = await this.Kresko.getKrAssetValue(
                    kreskoAsset.address,
                    userDebtAmount,
                    false,
                );
                expect(userDebtAmountInUSD.rawValue).to.equal(String(toFixedPoint(100)));

                // Initial collateral value: (10 * $20) = $200
                const initialUserCollateralAmountInUSD = await this.Kresko.getAccountCollateralValue(
                    this.signers.userOne.address,
                );
                expect(initialUserCollateralAmountInUSD.rawValue).to.equal(String(toFixedPoint(200)));

                // The account should be NOT liquidatable as collateral value ($200) >= min collateral value ($150)
                const initialCanLiquidate = await this.Kresko.isAccountLiquidatable(this.signers.userOne.address);
                expect(initialCanLiquidate).to.equal(false);

                // Change collateral asset's USD value from $20 to $11
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.transmit(fixedPointOraclePrice);

                // Updated collateral value: (10 * $11) = $110
                const userCollateralAmountInUSD = await this.Kresko.getAccountCollateralValue(
                    this.signers.userOne.address,
                );
                expect(userCollateralAmountInUSD.rawValue).to.equal(String(toFixedPoint(110)));

                // The account should be liquidatable as collateral value ($110) < min collateral value ($150)
                const canLiquidate = await this.Kresko.isAccountLiquidatable(this.signers.userOne.address);
                expect(canLiquidate).to.equal(true);
            });
        });

        describe("#liquidate", function () {
            it("should allow unhealthy accounts to be liquidated", async function () {
                // Change collateral asset's USD value from $20 to $11
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.transmit(fixedPointOraclePrice);

                // Confirm we can liquidate this account
                const canLiquidate = await this.Kresko.isAccountLiquidatable(this.signers.userOne.address);
                expect(canLiquidate).to.equal(true);

                // Fetch userOne's debt and collateral balances prior to liquidation
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const beforeUserOneCollateralAmount = await this.Kresko.collateralDeposits(
                    this.signers.userOne.address,
                    collateralAsset.address,
                );
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const beforeUserOneDebtAmount = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                );

                // Fetch userTwo's collateral and kresko asset balance
                const beforeUserTwoCollateralBalance = await collateralAsset.balanceOf(this.signers.userTwo.address);
                const beforeUserTwoKreskoAssetBalance = await kreskoAsset.balanceOf(this.signers.userTwo.address);

                // Fetch contract's collateral balance
                const beforeKreskoCollateralBalance = await collateralAsset.balanceOf(this.Kresko.address);

                // Fetch the Kresko asset's total supply
                const beforeKreskoAssetTotalSupply = await kreskoAsset.totalSupply();

                // userTwo holds Kresko assets that can be used to repay userOne's loan
                const repayAmount = toFixedPoint(1);
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await this.Kresko.connect(this.signers.userTwo).liquidate(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    String(repayAmount),
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    true,
                );

                // Confirm that the liquidated user's debt amount has decreased by the repaid amount
                const afterUserOneDebtAmount = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                );
                expect(afterUserOneDebtAmount).to.equal(beforeUserOneDebtAmount.sub(repayAmount));
                // Confirm that some of the liquidated user's collateral has been seized
                const afterUserOneCollateralAmount = await this.Kresko.collateralDeposits(
                    this.signers.userOne.address,
                    collateralAsset.address,
                );
                expect(Number(afterUserOneCollateralAmount)).to.be.lessThan(Number(beforeUserOneCollateralAmount));

                // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
                const afterUserTwoKreskoAssetBalance = await kreskoAsset.balanceOf(this.signers.userTwo.address);
                expect(afterUserTwoKreskoAssetBalance).to.equal(
                    String(Number(beforeUserTwoKreskoAssetBalance) - Number(repayAmount)),
                );

                // Confirm that userTwo has received some collateral from the contract
                const afterUserTwoCollateralBalance = await collateralAsset.balanceOf(this.signers.userTwo.address);
                expect(Number(afterUserTwoCollateralBalance)).to.be.greaterThan(Number(beforeUserTwoCollateralBalance));

                // Confirm that Kresko contract's collateral balance has decreased.
                const afterKreskoCollateralBalance = await collateralAsset.balanceOf(this.Kresko.address);
                expect(Number(afterKreskoCollateralBalance)).to.be.lessThan(Number(beforeKreskoCollateralBalance));

                // Confirm that Kresko asset's total supply has decreased.
                const afterKreskoAssetTotalSupply = await kreskoAsset.totalSupply();
                expect(afterKreskoAssetTotalSupply).to.equal(
                    String(beforeKreskoAssetTotalSupply - Number(repayAmount)),
                );
            });

            it("should emit LiquidationOccurred event", async function () {
                // Change collateral asset's USD value from $20 to $11
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.transmit(fixedPointOraclePrice);

                // Fetch user's debt amount prior to liquidation
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const beforeUserOneDebtAmount = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAsset.address),
                );

                // Attempt liquidation
                const repayAmount = 100; // userTwo holds Kresko assets that can be used to repay userOne's loan
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.Kresko.connect(this.signers.userTwo).liquidate(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    String(repayAmount),
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    true,
                );

                const { args } = await extractEventFromTxReceipt<LiquidationOccurredEvent>(
                    receipt,
                    "LiquidationOccurred",
                );
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.liquidator).to.equal(this.signers.userTwo.address);
                expect(args.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(args.repayAmount).to.equal(String(repayAmount));
                expect(args.seizedCollateralAsset).to.equal(collateralAsset.address);

                // Seized amount is calculated internally on contract, here we're just doing a sanity max check
                const maxPossibleSeizedAmount = beforeUserOneDebtAmount;
                expect(fromBig(args.collateralSent)).to.be.lessThanOrEqual(maxPossibleSeizedAmount);
            });

            it("should send liquidator collateral profit and reduce debt accordingly _keepKrAssetDebt = false", async function () {
                await this.Kresko.updateBurnFee(toFixedPoint(0.05)); // 5% burnFee
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;

                const krAssetDebt = await this.Kresko.kreskoAssetDebt(
                    this.signers.userTwo.address,
                    kreskoAsset.address,
                );

                // remove all debt
                await kreskoAsset.connect(this.signers.userTwo).approve(this.Kresko.address, MaxUint256);
                await this.Kresko.connect(this.signers.userTwo).burnKreskoAsset(
                    this.signers.userTwo.address,
                    kreskoAsset.address,
                    String(krAssetDebt),
                    0,
                );

                const liquidatorKrAssetValueBefore = Number(
                    await this.Kresko.getAccountKrAssetValue(this.signers.userTwo.address),
                );
                expect(liquidatorKrAssetValueBefore).to.equal(0);

                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const liquidatorCollateralBalanceBefore = fromBig(
                    await this.Kresko.collateralDeposits(this.signers.userTwo.address, collateralAsset.address),
                    this.collDecimals,
                );

                const userAddresses = [this.signers.userOne.address, this.signers.userTwo.address];
                const initialUserCollateralBalance = toBig("10000", this.collDecimals);
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    for (const userAddress of userAddresses) {
                        await collateralAssetInfo.collateralAsset.setBalanceOf(
                            userAddress,
                            initialUserCollateralBalance,
                        );
                    }
                }

                // userOne deposits 1001e18 of the collateral asset
                const userOneDepositAmount = toBig("1000", this.collDecimals); // 1000 * $20 = $20,000 in collateral value
                await this.Kresko.connect(this.signers.userOne).depositCollateral(
                    this.signers.userOne.address,
                    collateralAsset.address,
                    userOneDepositAmount,
                );

                // userOne mints 1000 of the Kresko asset
                const useOneMintAmount = parseEther("1000"); // 1000 * $10 = $10,000 in debt value
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    useOneMintAmount,
                );

                // userTwo deposits 10,000 of the collateral asset
                const userTwoDepositAmount = toBig("10000", this.collDecimals); // 10,000 * $20 = $200,000 in collateral value
                await this.Kresko.connect(this.signers.userTwo).depositCollateral(
                    this.signers.userTwo.address,
                    collateralAsset.address,
                    userTwoDepositAmount,
                );

                // userTwo mints 100 of the Kresko asset
                const userTwoMintAmount = parseEther("200"); // 200 * $10 = $2,000 in debt value
                await this.Kresko.connect(this.signers.userTwo).mintKreskoAsset(
                    this.signers.userTwo.address,
                    kreskoAsset.address,
                    userTwoMintAmount,
                );

                // Change collateral asset's USD value from $20 to $5
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 5;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.transmit(fixedPointOraclePrice);

                // Fetch user's debt amount prior to liquidation
                const userOneDebtAmountBeforeLiquidation = Number(
                    formatEther(await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAsset.address)),
                );

                // userTwo holds Kresko assets that can be used to repay userOne's underwater loan
                const repayAmount = parseEther("200");

                // Get liquidators krAssetDebt before liquidation
                const liquidatorKrAssetDebtBeforeLiquidation = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, kreskoAsset.address),
                );

                // Check liquidators collateralTokens balance before liquidation
                const liquidatorBalanceInWalletBeforeLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.signers.userTwo.address),
                    this.collDecimals,
                );

                // Liquidator has 0 collateral tokens in wallet before liquidation
                expect(liquidatorBalanceInWalletBeforeLiquidation).to.equal(0);

                // Liquidator has collateral deposit in the protocol
                const liquidatorBalanceInProtocolBeforeLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );
                expect(liquidatorBalanceInProtocolBeforeLiquidation).to.equal(
                    fromBig(userTwoDepositAmount, this.collDecimals) + liquidatorCollateralBalanceBefore,
                );

                // Get underwater users collateral deposits before liquidation
                const userOneCollateralDepositAmountBeforeLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                const userOneKrAssetValueBeforeLiq = Number(
                    await this.Kresko.getAccountKrAssetValue(this.signers.userOne.address),
                );

                const liquidatorDebtBefore = Number(
                    formatEther(await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, kreskoAsset.address)),
                );

                // Liquidation
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.Kresko.connect(this.signers.userTwo).liquidate(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    repayAmount,
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    false,
                );

                const { args } = await extractEventFromTxReceipt<LiquidationOccurredEvent>(
                    receipt,
                    "LiquidationOccurred",
                );
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.liquidator).to.equal(this.signers.userTwo.address);
                expect(args.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(args.repayAmount).to.equal(repayAmount);
                expect(args.seizedCollateralAsset).to.equal(collateralAsset.address);
                expect(Number(args.collateralSent)).to.be.greaterThan(0);

                const liquidatorDebtAfter = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, args.repayKreskoAsset),
                );

                expect(liquidatorDebtAfter).to.be.lessThan(liquidatorDebtBefore);

                const userOneDebtAmountAfterLiquidation = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAsset.address),
                );

                const userOneKrAssetValueAfterLiq = Number(
                    await this.Kresko.getAccountKrAssetValue(this.signers.userOne.address),
                );

                const liquidatorKrAssetDebtAfterLiquidation = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, kreskoAsset.address),
                );

                const userOneCollateralDepositAmountAfterLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                const liquidatorCollateralBalanceInWalletAfterLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.signers.userTwo.address),
                    this.collDecimals,
                );

                const liquidatorBalanceInProtocolAfterLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                // Liquidator collateral deposits in the protocol stay the same
                expect(liquidatorBalanceInProtocolAfterLiquidation).to.equal(
                    liquidatorBalanceInProtocolBeforeLiquidation,
                );

                // User one get his/hers collateral reduced
                expect(userOneCollateralDepositAmountAfterLiquidation).to.be.lessThan(
                    userOneCollateralDepositAmountBeforeLiquidation,
                );

                // User one get his/hers debt reduced
                expect(userOneDebtAmountAfterLiquidation).to.be.lessThan(userOneDebtAmountBeforeLiquidation);

                // User one get his/hers krAsset value reduced
                expect(userOneKrAssetValueAfterLiq).to.be.lessThan(userOneKrAssetValueBeforeLiq);

                // Liquidator does not retain the debt that was being used to pay for useOnes underwater position
                expect(liquidatorKrAssetDebtBeforeLiquidation - fromBig(repayAmount)).to.be.equal(
                    liquidatorKrAssetDebtAfterLiquidation,
                );

                // Liquidator gets pure profit in the wallet
                expect(liquidatorBalanceInWalletBeforeLiquidation).to.be.lessThan(
                    liquidatorCollateralBalanceInWalletAfterLiquidation,
                );

                const liquidatorProfit =
                    liquidatorCollateralBalanceInWalletAfterLiquidation - liquidatorBalanceInWalletBeforeLiquidation;

                const feeRecipientBalance = fromBig(
                    await collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS),
                    this.collDecimals,
                );

                // Protocol should receive 5% (MAX_BURN_FEE) from the liquidation
                expect(feeRecipientBalance).to.be.closeTo(liquidatorProfit / 2, feeRecipientBalance * 0.02);

                // Shouldn't be able to liquidate a healthy position anymore
                await expect(
                    this.Kresko.connect(this.signers.userTwo).liquidate(
                        this.signers.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        false,
                    ),
                ).to.be.reverted;
            });

            it("should send the liquidator whole collateral and keep debt position when _keepKrAssetDebt = true", async function () {
                await this.Kresko.updateBurnFee(toFixedPoint(0.05)); // 5% burnFee

                const userAddresses = [this.signers.userOne.address, this.signers.userTwo.address];
                const initialUserCollateralBalance = toBig("10000", this.collDecimals);
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    for (const userAddress of userAddresses) {
                        await collateralAssetInfo.collateralAsset.setBalanceOf(
                            userAddress,
                            initialUserCollateralBalance,
                        );
                    }
                }

                // userOne deposits 1001e18 of the collateral asset
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const userOneDepositAmount = toBig("1000", this.collDecimals); // 1000 * $20 = $20,000 in collateral value
                await this.Kresko.connect(this.signers.userOne).depositCollateral(
                    this.signers.userOne.address,
                    collateralAsset.address,
                    userOneDepositAmount,
                );

                // userOne mints 100 of the Kresko asset
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const useOneMintAmount = parseEther("1000"); // 1000 * $10 = $10,000 in debt value
                await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    useOneMintAmount,
                );

                // userTwo deposits 10,000 of the collateral asset
                const userTwoDepositAmount = toBig("10000", this.collDecimals); // 10,000 * $20 = $200,000 in collateral value
                await this.Kresko.connect(this.signers.userTwo).depositCollateral(
                    this.signers.userTwo.address,
                    collateralAsset.address,
                    userTwoDepositAmount,
                );

                // userTwo mints 100 of the Kresko asset
                const userTwoMintAmount = parseEther("500"); // 500 * $10 = $5,000 in debt value
                await this.Kresko.connect(this.signers.userTwo).mintKreskoAsset(
                    this.signers.userTwo.address,
                    kreskoAsset.address,
                    userTwoMintAmount,
                );

                // Change collateral asset's USD value from $20 to $5
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 5;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.transmit(fixedPointOraclePrice);

                // Fetch user's debt amount prior to liquidation
                const userOneDebtAmountBeforeLiquidation = Number(
                    formatEther(await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAsset.address)),
                );

                // userTwo holds Kresko assets that can be used to repay userOne's underwater loan
                const repayAmount = parseEther("200");

                // Get liquidators krAssetDebt before liquidation
                const liquidatorKrAssetDebtBeforeLiquidation = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, kreskoAsset.address),
                );

                // Check liquidators collateralTokens balance before liquidation
                const liquidatorBalanceInWalletBeforeLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.signers.userTwo.address),
                    this.collDecimals,
                );

                // Liquidator has 0 collateral tokens in wallet before liquidation
                expect(liquidatorBalanceInWalletBeforeLiquidation).to.equal(0);

                // Liquidator has collateral deposit in the protocol
                const liquidatorBalanceInProtocolBeforeLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                const originalUserTwoDeposit = 100;
                expect(liquidatorBalanceInProtocolBeforeLiquidation).to.equal(
                    fromBig(userTwoDepositAmount, this.collDecimals) + originalUserTwoDeposit,
                );

                // Get underwater users collateral deposits before liquidation
                const userOneCollateralDepositAmountBeforeLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                const userOneKrAssetValueBeforeLiq = Number(
                    await this.Kresko.getAccountKrAssetValue(this.signers.userOne.address),
                );

                const liquidatorDebtBefore = Number(
                    formatEther(await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, kreskoAsset.address)),
                );

                // Liquidation
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.Kresko.connect(this.signers.userTwo).liquidate(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    repayAmount,
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    true,
                );

                const { args } = await extractEventFromTxReceipt<LiquidationOccurredEvent>(
                    receipt,
                    "LiquidationOccurred",
                );
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.liquidator).to.equal(this.signers.userTwo.address);
                expect(args.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(args.repayAmount).to.equal(repayAmount);
                expect(args.seizedCollateralAsset).to.equal(collateralAsset.address);
                expect(Number(args.collateralSent)).to.be.greaterThan(0);

                const liquidatorDebtAfter = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, args.repayKreskoAsset),
                );

                expect(liquidatorDebtAfter).to.be.equal(liquidatorDebtBefore);

                const userOneDebtAmountAfterLiquidation = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userOne.address, kreskoAsset.address),
                );

                const userOneKrAssetValueAfterLiq = Number(
                    await this.Kresko.getAccountKrAssetValue(this.signers.userOne.address),
                );

                const liquidatorKrAssetDebtAfterLiquidation = fromBig(
                    await this.Kresko.kreskoAssetDebt(this.signers.userTwo.address, kreskoAsset.address),
                );

                const userOneCollateralDepositAmountAfterLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                const liquidatorCollateralBalanceInWalletAfterLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.signers.userTwo.address),
                    this.collDecimals,
                );

                const liquidatorBalanceInProtocolAfterLiquidation = fromBig(
                    await this.Kresko.collateralDeposits(
                        this.signers.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                    this.collDecimals,
                );

                // Liquidator collateral deposits in the protocol stay the same
                expect(liquidatorBalanceInProtocolAfterLiquidation).to.equal(
                    liquidatorBalanceInProtocolBeforeLiquidation,
                );

                // User one get his/hers collateral reduced
                expect(userOneCollateralDepositAmountAfterLiquidation).to.be.lessThan(
                    userOneCollateralDepositAmountBeforeLiquidation,
                );

                // User one get his/hers debt reduced
                expect(userOneDebtAmountAfterLiquidation).to.be.lessThan(userOneDebtAmountBeforeLiquidation);

                // User one get his/hers krAsset value reduced
                expect(userOneKrAssetValueAfterLiq).to.be.lessThan(userOneKrAssetValueBeforeLiq);

                // Liquidator retains the debt that was being used to pay for useOnes underwater position
                expect(liquidatorKrAssetDebtBeforeLiquidation).to.be.equal(liquidatorKrAssetDebtAfterLiquidation);

                const feeRecipientBalance = fromBig(
                    await collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS),
                    this.collDecimals,
                );
                // Liquidator gets whole collateral - burnfee in his/hers wallet
                expect(liquidatorCollateralBalanceInWalletAfterLiquidation).to.be.equal(
                    fromBig(args.collateralSent, this.collDecimals),
                );

                const userOneCollateralLost =
                    userOneCollateralDepositAmountBeforeLiquidation - userOneCollateralDepositAmountAfterLiquidation;

                const liquidatorSeizedTotal =
                    liquidatorCollateralBalanceInWalletAfterLiquidation - liquidatorBalanceInWalletBeforeLiquidation;

                // Protocol should receive 10% (MAX_BURN_FEE) from the liquidation
                expect(liquidatorSeizedTotal).to.equal(userOneCollateralLost - feeRecipientBalance);
            });

            it("should allow liquidations without liquidator approval of Kresko assets to Kresko.sol contract", async function () {
                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                const oracle = this.collateralAssetInfos[0].oracle;
                await oracle.transmit(fixedPointOraclePrice);

                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                // Check that liquidator's token approval to Kresko.sol contract is 0
                expect(await kreskoAsset.allowance(this.signers.userTwo.address, this.Kresko.address)).to.equal(0);

                // Liquidation should succeed despite lack of token approval
                const repayAmount = 100;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.Kresko.connect(this.signers.userTwo).liquidate(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    repayAmount,
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    true,
                );

                const { args } = await extractEventFromTxReceipt(receipt, "LiquidationOccurred");
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.liquidator).to.equal(this.signers.userTwo.address);
                expect(args.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(args.repayAmount).to.equal(repayAmount);
                expect(args.seizedCollateralAsset).to.equal(collateralAsset.address);

                // Confirm that liquidator's token approval is still 0
                expect(await kreskoAsset.allowance(this.signers.userTwo.address, this.Kresko.address)).to.equal(0);
            });

            it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                const oracle = this.collateralAssetInfos[0].oracle;
                await oracle.transmit(fixedPointOraclePrice);

                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                // Liquidator increases contract's token approval
                const repayAmount = 100;
                await kreskoAsset.connect(this.signers.userTwo).approve(this.Kresko.address, repayAmount);
                expect(await kreskoAsset.allowance(this.signers.userTwo.address, this.Kresko.address)).to.equal(
                    repayAmount,
                );

                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.Kresko.connect(this.signers.userTwo).liquidate(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                    repayAmount,
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    true,
                );

                const { args } = await extractEventFromTxReceipt(receipt, "LiquidationOccurred");
                expect(args.account).to.equal(this.signers.userOne.address);
                expect(args.liquidator).to.equal(this.signers.userTwo.address);
                expect(args.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(args.repayAmount).to.equal(repayAmount);
                expect(args.seizedCollateralAsset).to.equal(collateralAsset.address);

                // Confirm that liquidator's token approval is unchanged
                expect(await kreskoAsset.allowance(this.signers.userTwo.address, this.Kresko.address)).to.equal(
                    repayAmount,
                );
            });

            it("should not allow liquidations of healthy accounts", async function () {
                const repayAmount = 100;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    this.Kresko.connect(this.signers.userTwo).liquidate(
                        this.signers.userOne.address,
                        this.kreskoAssetInfo[0].kreskoAsset.address,
                        repayAmount,
                        this.collateralAssetInfos[0].collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        false,
                    ),
                ).to.be.revertedWith("KR: !accountLiquidatable");
            });

            it("should not allow liquidations if repayment amount is 0", async function () {
                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                const oracle = this.collateralAssetInfos[0].oracle;
                await oracle.transmit(fixedPointOraclePrice);

                // userTwo holds Kresko assets that can be used to repay userOne's loan
                const repayAmount = 0;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                await expect(
                    this.Kresko.connect(this.signers.userTwo).liquidate(
                        this.signers.userOne.address,
                        this.kreskoAssetInfo[0].kreskoAsset.address,
                        repayAmount,
                        this.collateralAssetInfos[0].collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        true,
                    ),
                ).to.be.revertedWith("KR: 0-repay");
            });

            it("should not allow liquidations with krAsset amount greater than krAsset debt of user", async function () {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;

                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await this.collateralAssetInfos[0].oracle.transmit(fixedPointOraclePrice);

                // Get the debt for this kresko asset
                const krAssetDebtUserOne = await this.Kresko.kreskoAssetDebt(
                    this.signers.userOne.address,
                    kreskoAsset.address,
                );

                const repayAmount = toBig(1001);
                // Ensure we are repaying more than debt
                expect(repayAmount.gt(krAssetDebtUserOne)).to.be.true;

                // Set the indexes required
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;

                // userTwo holds Kresko assets that can be used to repay userOne's loan
                // Ensure userTwo cannot repay more than debt
                await expect(
                    this.Kresko.connect(this.signers.userTwo).liquidate(
                        this.signers.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        false,
                    ),
                ).to.be.revertedWith("KR: repayAmount > debtAmount");
            });
            it("should not allow liquidations with USD value greater than the USD value required for regaining healthy position", async function () {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;

                // Change krAsset's USD value from $20 to $15
                const updatedCollateralPrice = 15;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await this.kreskoAssetInfo[0].oracle.transmit(fixedPointOraclePrice);

                // Get the max liquidatable value for the user
                const maxUSDValue = fromBig(
                    (
                        await this.Kresko.calculateMaxLiquidatableValueForAssets(
                            this.signers.userOne.address,
                            kreskoAsset.address,
                            collateralAsset.address,
                        )
                    ).rawValue,
                );

                // Ensure oracle prices match what was set
                const oraclePrice = fromBig(await this.kreskoAssetInfo[0].oracle.latestAnswer());
                expect(oraclePrice).to.equal(updatedCollateralPrice);
                const repayAmount = 10;
                const repayUSD = repayAmount * oraclePrice;

                // Ensure repayment amount is greater than the maxUSDValue that can be repaid
                expect(repayUSD).to.be.greaterThan(maxUSDValue);

                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;

                // Ensure liquidation cannot happen
                await expect(
                    this.Kresko.connect(this.signers.userTwo).liquidate(
                        this.signers.userOne.address,
                        kreskoAsset.address,
                        toBig(repayAmount),
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        false,
                    ),
                ).to.be.revertedWith("KR: repayUSD > maxUSD");
            });
        });

        it("should not allow borrowers to liquidate themselves", async function () {
            // Change collateral asset's USD value from $20 to $11
            const updatedCollateralPrice = 11;
            const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
            await this.collateralAssetInfos[0].oracle.transmit(fixedPointOraclePrice);

            // Transfer user two's synthetic assets to user one so they can repay their loan in full
            const userTwoSynthBalance = await this.kreskoAssetInfo[0].kreskoAsset.balanceOf(
                this.signers.userTwo.address,
            );

            await this.kreskoAssetInfo[0].kreskoAsset
                .connect(this.signers.userTwo)
                .transfer(this.signers.userOne.address, userTwoSynthBalance);

            const repayAmount = 100;
            const mintedKreskoAssetIndex = 0;
            const depositedCollateralAssetIndex = 0;
            await expect(
                this.Kresko.connect(this.signers.userOne).liquidate(
                    this.signers.userOne.address,
                    this.kreskoAssetInfo[0].kreskoAsset.address,
                    repayAmount,
                    this.collateralAssetInfos[0].collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                    false,
                ),
            ).to.be.revertedWith("KR: self liquidation");
        });
    });
});
