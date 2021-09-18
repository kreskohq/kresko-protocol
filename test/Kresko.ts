import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { BigNumber, Contract, ContractTransaction } from "ethers";

import { toFixedPoint, fixedPointDiv, fixedPointMul } from "../utils/fixed-point";
import { extractEventFromTxReceipt } from "../utils/events";

import { BasicOracle } from "../typechain/BasicOracle";
import { Kresko } from "../typechain/Kresko";
import { MockToken } from "../typechain/MockToken";
import { Signers } from "../types";
import { Result } from "@ethersproject/abi";

const ADDRESS_ZERO = hre.ethers.constants.AddressZero;
const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
const SYMBOL_ONE = "ONE";
const SYMBOL_TWO = "TWO";
const NAME_ONE = "One Kresko Asset";
const NAME_TWO = "Two Kresko Asset";
const BURN_FEE = toFixedPoint(0.01); // 1%
const MINIMUM_COLLATERALIZATION_RATIO: number = 150;
const CLOSE_FACTOR = toFixedPoint(0.2); // 20%
const LIQUIDATION_INCENTIVE = toFixedPoint(1.1); // 110% -> liquidators make 10% on liquidations
const FEE_RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000FEE";

const { parseEther } = hre.ethers.utils;
const { deployContract } = hre.waffle;

const ONE = toFixedPoint(1);
const ZERO_POINT_FIVE = toFixedPoint(0.5);

async function deployAndWhitelistCollateralAsset(
    kresko: Contract,
    collateralFactor: number,
    oraclePrice: number,
    decimals: number,
) {
    const mockTokenArtifact: Artifact = await hre.artifacts.readArtifact("MockToken");
    const collateralAsset = <MockToken>await deployContract(kresko.signer, mockTokenArtifact, [decimals]);

    const signerAddress = await kresko.signer.getAddress();
    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(kresko.signer, basicOracleArtifact, [signerAddress]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);

    const fixedPointCollateralFactor = toFixedPoint(collateralFactor);
    await kresko.addCollateralAsset(collateralAsset.address, fixedPointCollateralFactor, oracle.address);

    return {
        collateralAsset,
        oracle,
        factor: fixedPointCollateralFactor,
        oraclePrice: fixedPointOraclePrice,
        decimals,
        fromDecimal: (decimalValue: any) => toFixedPoint(decimalValue, decimals),
        fromFixedPoint: (fixedPointValue: BigNumber) => {
            // Converts a fixed point value (ie a number with 18 decimals) to `decimals` decimals
            if (decimals > 18) {
                return fixedPointValue.mul(10 ** (decimals - 18));
            } else if (decimals < 18) {
                return fixedPointValue.div(10 ** (18 - decimals));
            }
            return fixedPointValue;
        },
    };
}

async function addNewKreskoAsset(kresko: Contract, name: string, symbol: string, kFactor: number, oraclePrice: number) {
    const signerAddress = await kresko.signer.getAddress();
    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(kresko.signer, basicOracleArtifact, [signerAddress]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);

    const fixedPointKFactor = toFixedPoint(kFactor);
    const tx: ContractTransaction = await kresko.addKreskoAsset(name, symbol, fixedPointKFactor, oracle.address);

    let events: any = await extractEventFromTxReceipt(tx, "KreskoAssetAdded");
    const krAssetAddress = events[0].args.kreskoAsset;
    const KreskoAssetContract = await hre.ethers.getContractFactory("KreskoAsset");
    const kreskoAsset = KreskoAssetContract.attach(krAssetAddress);
    return {
        kreskoAsset,
        oracle,
        oraclePrice: fixedPointOraclePrice,
        kFactor: fixedPointKFactor,
    };
}

describe("Kresko", function () {
    beforeEach(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];

        const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
        this.kresko = <Kresko>(
            await deployContract(this.signers.admin, kreskoArtifact, [
                BURN_FEE,
                CLOSE_FACTOR,
                FEE_RECIPIENT_ADDRESS,
                LIQUIDATION_INCENTIVE,
                MINIMUM_COLLATERALIZATION_RATIO,
            ])
        );
    });

    describe("Collateral Assets", function () {
        beforeEach(async function () {
            this.collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);
        });

        it("Cannot add collateral assets more than once", async function () {
            await expect(
                this.kresko.addCollateralAsset(this.collateralAssetInfo.collateralAsset.address, ONE, ADDRESS_ONE),
            ).to.be.revertedWith("ASSET_EXISTS");
        });

        describe("Cannot add collateral assets with invalid parameters", function () {
            it("invalid asset address", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_ZERO, ONE, ADDRESS_ONE)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
            it("invalid factor", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_TWO, ONE.add(1), ADDRESS_ONE)).to.be.revertedWith(
                    "INVALID_FACTOR",
                );
            });
            it("invalid oracle address", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_TWO, ONE, ADDRESS_ZERO)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
        });

        describe("Cannot update collateral assets with invalid parameters", function () {
            it("reverts when setting the collateral factor to greater than 1", async function () {
                await expect(
                    this.kresko.updateCollateralFactor(this.collateralAssetInfo.collateralAsset.address, ONE.add(1)),
                ).to.be.revertedWith("INVALID_FACTOR");
            });
            it("reverts when setting the oracle address to the zero address", async function () {
                await expect(
                    this.kresko.updateCollateralOracle(this.collateralAssetInfo.collateralAsset.address, ADDRESS_ZERO),
                ).to.be.revertedWith("ZERO_ADDRESS");
            });
        });

        it("should allow owner to add assets", async function () {
            const collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);

            const asset = await this.kresko.collateralAssets(collateralAssetInfo.collateralAsset.address);
            expect(asset.factor.rawValue).to.equal(collateralAssetInfo.factor);
            expect(asset.oracle).to.equal(collateralAssetInfo.oracle.address);
            expect(asset.exists).to.be.true;
        });

        it("should allow owner to update factor", async function () {
            const collateralAssetAddress = this.collateralAssetInfo.collateralAsset.address;
            await this.kresko.updateCollateralFactor(collateralAssetAddress, ZERO_POINT_FIVE);

            const asset = await this.kresko.collateralAssets(collateralAssetAddress);
            expect(asset.factor.rawValue).to.equal(ZERO_POINT_FIVE);
        });

        it("should allow owner to update oracle address", async function () {
            const collateralAssetAddress = this.collateralAssetInfo.collateralAsset.address;
            await this.kresko.updateCollateralOracle(collateralAssetAddress, ADDRESS_TWO);

            const asset = await this.kresko.collateralAssets(collateralAssetAddress);
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should not allow non-owner to add assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).addCollateralAsset(ADDRESS_TWO, 1, ADDRESS_TWO),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should not allow non-owner to update assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).updateCollateralFactor(ADDRESS_ONE, ZERO_POINT_FIVE),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(
                this.kresko.connect(this.userOne).updateCollateralOracle(ADDRESS_ONE, ADDRESS_TWO),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Account collateral", function () {
        beforeEach(async function () {
            this.collateralAssetInfos = await Promise.all([
                deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18),
                deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 12),
                deployAndWhitelistCollateralAsset(this.kresko, 0.6, 20.123, 24),
            ]);

            // Give userOne a balance of 1000 for each collateral asset.
            this.initialUserCollateralBalance = 1000;
            for (const collateralAssetInfo of this.collateralAssetInfos) {
                await collateralAssetInfo.collateralAsset.setBalanceOf(
                    this.userOne.address,
                    collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                );
            }
        });

        describe("Depositing collateral", function () {
            it("should allow an account to deposit whitelisted collateral", async function () {
                // Initially, the array of the user's deposited collateral assets should be empty.
                const depositedCollateralAssetsBefore = await this.kresko.getDepositedCollateralAssets(
                    this.userOne.address,
                );
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                const collateralAssetInfo = this.collateralAssetInfos[0];
                const collateralAsset = collateralAssetInfo.collateralAsset;

                // Deposit it
                const depositAmount = collateralAssetInfo.fromDecimal(123.321);
                await this.kresko.connect(this.userOne).depositCollateral(collateralAsset.address, depositAmount);

                // Confirm the array of the user's deposited collateral assets has been pushed to.
                const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(
                    this.userOne.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await this.kresko.collateralDeposits(
                    this.userOne.address,
                    collateralAsset.address,
                );
                expect(amountDeposited).to.equal(depositAmount);

                // Confirm the amount as been transferred from the user into Kresko.sol
                const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                expect(kreskoBalance).to.equal(depositAmount);
                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                expect(userOneBalance).to.equal(
                    collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance).sub(depositAmount),
                );
            });

            it("should allow an account to deposit more collateral to an existing deposit", async function () {
                const collateralAssetInfo = this.collateralAssetInfos[0];
                const collateralAsset = collateralAssetInfo.collateralAsset;

                // Deposit an initial amount
                const depositAmount0 = collateralAssetInfo.fromDecimal(123.321);
                await this.kresko.connect(this.userOne).depositCollateral(collateralAsset.address, depositAmount0);

                // Deposit a secound amount
                const depositAmount1 = collateralAssetInfo.fromDecimal(321.123);
                await this.kresko.connect(this.userOne).depositCollateral(collateralAsset.address, depositAmount1);

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(
                    this.userOne.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await this.kresko.collateralDeposits(
                    this.userOne.address,
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
                await this.kresko.connect(this.userOne).depositCollateral(collateralAsset0.address, depositAmount0);

                // Deposit a different collateral asset.
                const depositAmount1 = collateralAssetInfo1.fromDecimal(321.123);
                await this.kresko.connect(this.userOne).depositCollateral(collateralAsset1.address, depositAmount1);

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(
                    this.userOne.address,
                );
                expect(depositedCollateralAssetsAfter).to.deep.equal([
                    collateralAsset0.address,
                    collateralAsset1.address,
                ]);
            });

            it("should revert if depositing collateral that has not been whitelisted", async function () {
                await expect(
                    this.kresko.connect(this.userOne).depositCollateral(ADDRESS_ONE, parseEther("123")),
                ).to.be.revertedWith("ASSET_NOT_VALID");
            });

            it("should revert if depositing an amount of 0", async function () {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                await expect(
                    this.kresko.connect(this.userOne).depositCollateral(collateralAsset.address, 0),
                ).to.be.revertedWith("AMOUNT_ZERO");
            });
        });

        describe("Withdrawing collateral", async function () {
            beforeEach(async function () {
                // Have userOne deposit 100 of each collateral asset.
                // This results in an account collateral value of 40491.
                this.initialDepositAmount = 100;
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    await this.kresko
                        .connect(this.userOne)
                        .depositCollateral(
                            collateralAssetInfo.collateralAsset.address,
                            collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                        );
                }
            });

            describe("when the account's minimum collateral value is 0", function () {
                it("should allow an account to withdraw their entire deposit", async function () {
                    const collateralAssetInfo = this.collateralAssetInfos[0];
                    const collateralAsset = collateralAssetInfo.collateralAsset;

                    await this.kresko.connect(this.userOne).withdrawCollateral(
                        collateralAsset.address,
                        collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                        0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                    );
                    // Ensure that the collateral asset is removed from the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await this.kresko.getDepositedCollateralAssets(
                        this.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([
                        // index 2 was moved to index 0 due to the way elements are removed,
                        // which involves copying the last element into the index that's being removed
                        this.collateralAssetInfos[2].collateralAsset.address,
                        this.collateralAssetInfos[1].collateralAsset.address,
                    ]);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await this.kresko.collateralDeposits(
                        this.userOne.address,
                        collateralAsset.address,
                    );
                    expect(amountDeposited).to.equal(0);

                    // Ensure the amount transferred is correct
                    const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                    expect(kreskoBalance).to.equal(BigNumber.from(0));
                    const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                    expect(userOneBalance).to.equal(collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance));
                });

                it("should allow an account to withdraw a portion of their deposit", async function () {
                    const amountToWithdraw = parseEther("49.43");
                    const collateralAssetInfo = this.collateralAssetInfos[0];
                    const collateralAsset = collateralAssetInfo.collateralAsset;
                    const initialDepositAmount = collateralAssetInfo.fromDecimal(this.initialDepositAmount);

                    await this.kresko.connect(this.userOne).withdrawCollateral(
                        collateralAsset.address,
                        amountToWithdraw,
                        0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                    );

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await this.kresko.collateralDeposits(
                        this.userOne.address,
                        collateralAsset.address,
                    );
                    expect(amountDeposited).to.equal(initialDepositAmount.sub(amountToWithdraw));

                    // Ensure that the collateral asset is still in the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await this.kresko.getDepositedCollateralAssets(
                        this.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([
                        this.collateralAssetInfos[0].collateralAsset.address,
                        this.collateralAssetInfos[1].collateralAsset.address,
                        this.collateralAssetInfos[2].collateralAsset.address,
                    ]);

                    const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                    expect(kreskoBalance).to.equal(initialDepositAmount.sub(amountToWithdraw));
                    const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                    expect(userOneBalance).to.equal(
                        collateralAssetInfo
                            .fromDecimal(this.initialUserCollateralBalance)
                            .sub(initialDepositAmount)
                            .add(amountToWithdraw),
                    );
                });
            });

            describe("when the account's minimum collateral value is > 0", function () {
                beforeEach(async function () {
                    // Deploy Kresko assets, adding them to the whitelist
                    const kreskoAssetInfo = await addNewKreskoAsset(this.kresko, NAME_TWO, SYMBOL_TWO, 1, 250); // kFactor = 1, price = $250

                    // Mint 100 of the kreskoAsset. This puts the minimum collateral value of userOne as
                    // 250 * 1.5 * 100 = 37,500, which is close to userOne's account collateral value
                    // of 40491.
                    const kreskoAssetMintAmount = parseEther("100");
                    await this.kresko
                        .connect(this.userOne)
                        .mintKreskoAsset(kreskoAssetInfo.kreskoAsset.address, kreskoAssetMintAmount);
                });

                it("should allow an account to withdraw their deposit if it does not violate the health factor", async function () {
                    const collateralAssetInfo = this.collateralAssetInfos[0];
                    const collateralAsset = collateralAssetInfo.collateralAsset;
                    const initialDepositAmount = collateralAssetInfo.fromDecimal(this.initialDepositAmount);
                    const amountToWithdraw = collateralAssetInfo.fromDecimal(10);

                    // Ensure that the withdrawal would not put the account's collateral value
                    // less than the account's minimum collateral value:
                    const accountMinCollateralValue = await this.kresko.getAccountMinimumCollateralValue(
                        this.userOne.address,
                    );
                    const accountCollateralValue = await this.kresko.getAccountCollateralValue(this.userOne.address);
                    const [withdrawnCollateralValue] = await this.kresko.getCollateralValueAndOraclePrice(
                        collateralAsset.address,
                        amountToWithdraw,
                        false,
                    );
                    expect(
                        accountCollateralValue.rawValue
                            .sub(withdrawnCollateralValue.rawValue)
                            .gte(accountMinCollateralValue.rawValue),
                    ).to.be.true;

                    await this.kresko
                        .connect(this.userOne)
                        .withdrawCollateral(collateralAsset.address, amountToWithdraw, 0);
                    // Ensure that the collateral asset is still in the account's deposited collateral
                    // assets array.
                    const depositedCollateralAssets = await this.kresko.getDepositedCollateralAssets(
                        this.userOne.address,
                    );
                    expect(depositedCollateralAssets).to.deep.equal([
                        this.collateralAssetInfos[0].collateralAsset.address,
                        this.collateralAssetInfos[1].collateralAsset.address,
                        this.collateralAssetInfos[2].collateralAsset.address,
                    ]);

                    // Ensure the change in the user's deposit is recorded.
                    const amountDeposited = await this.kresko.collateralDeposits(
                        this.userOne.address,
                        collateralAsset.address,
                    );
                    expect(amountDeposited).to.equal(initialDepositAmount.sub(amountToWithdraw));

                    const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                    expect(kreskoBalance).to.equal(initialDepositAmount.sub(amountToWithdraw));
                    const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                    expect(userOneBalance).to.equal(
                        collateralAssetInfo
                            .fromDecimal(this.initialUserCollateralBalance)
                            .sub(initialDepositAmount)
                            .add(amountToWithdraw),
                    );

                    // Ensure the account's minimum collateral value is <= the account collateral value
                    // These are FixedPoint.Unsigned, be sure to use `rawValue` when appropriate!
                    const accountMinCollateralValueAfter = await this.kresko.getAccountMinimumCollateralValue(
                        this.userOne.address,
                    );
                    const accountCollateralValueAfter = await this.kresko.getAccountCollateralValue(
                        this.userOne.address,
                    );
                    expect(accountMinCollateralValueAfter.rawValue.lte(accountCollateralValueAfter.rawValue)).to.be
                        .true;
                });

                it("should revert if the withdrawal violates the health factor", async function () {
                    const collateralAssetInfo = this.collateralAssetInfos[0];
                    const collateralAsset = collateralAssetInfo.collateralAsset;

                    const amountToWithdraw = collateralAssetInfo.fromDecimal(this.initialDepositAmount);

                    // Ensure that the withdrawal would in fact put the account's collateral value
                    // less than the account's minimum collateral value:
                    const accountMinCollateralValue = await this.kresko.getAccountMinimumCollateralValue(
                        this.userOne.address,
                    );
                    const accountCollateralValue = await this.kresko.getAccountCollateralValue(this.userOne.address);
                    const [withdrawnCollateralValue] = await this.kresko.getCollateralValueAndOraclePrice(
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
                        this.kresko.connect(this.userOne).withdrawCollateral(
                            collateralAsset.address,
                            amountToWithdraw,
                            0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                        ),
                    ).to.be.revertedWith("HEALTH_FACTOR_VIOLATED");
                });
            });

            it("should revert if withdrawing the entire deposit but the depositedCollateralAssetIndex is incorrect", async function () {
                const collateralAssetInfo = this.collateralAssetInfos[0];
                const collateralAsset = collateralAssetInfo.collateralAsset;

                await expect(
                    this.kresko.connect(this.userOne).withdrawCollateral(
                        collateralAsset.address,
                        collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                        1, // Incorrect index
                    ),
                ).to.be.revertedWith("WRONG_DEPOSITED_COLLATERAL_ASSETS_INDEX");
            });

            it("should revert if withdrawing more than the user's deposit", async function () {
                const collateralAssetInfo = this.collateralAssetInfos[0];
                const collateralAsset = collateralAssetInfo.collateralAsset;

                await expect(
                    this.kresko
                        .connect(this.userOne)
                        .withdrawCollateral(
                            collateralAsset.address,
                            collateralAssetInfo.fromDecimal(this.initialDepositAmount) + 1,
                            0,
                        ),
                ).to.be.revertedWith("AMOUNT_TOO_HIGH");
            });

            it("should revert if withdrawing an amount of 0", async function () {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                await expect(
                    this.kresko.connect(this.userOne).withdrawCollateral(collateralAsset.address, 0, 0),
                ).to.be.revertedWith("AMOUNT_ZERO");
            });
        });

        describe("Account collateral value", async function () {
            beforeEach(async function () {
                // Have userOne deposit 100 of each collateral asset
                this.initialDepositAmount = BigNumber.from(100);
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    await this.kresko
                        .connect(this.userOne)
                        .depositCollateral(
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

                const collateralValue = await this.kresko.getAccountCollateralValue(this.userOne.address);
                expect(collateralValue.rawValue).to.equal(expectedCollateralValue);
            });

            it("returns 0 if the user has not deposited any collateral", async function () {
                const collateralValue = await this.kresko.getAccountCollateralValue(this.userTwo.address);
                expect(collateralValue.rawValue).to.equal(BigNumber.from(0));
            });
        });
    });

    describe("Kresko Assets", function () {
        beforeEach(async function () {
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>(
                await deployContract(this.signers.admin, kreskoArtifact, [
                    BURN_FEE,
                    CLOSE_FACTOR,
                    FEE_RECIPIENT_ADDRESS,
                    LIQUIDATION_INCENTIVE,
                    MINIMUM_COLLATERALIZATION_RATIO,
                ])
            );

            const tx: ContractTransaction = await this.kresko.addKreskoAsset(NAME_ONE, SYMBOL_ONE, ONE, ADDRESS_ONE);
            let events: any = await extractEventFromTxReceipt(tx, "KreskoAssetAdded");
            this.deployedAssetAddress = events[0].args.kreskoAsset;
        });

        it("Cannot add kresko assets that have the same symbol as an existing kresko asset", async function () {
            await expect(this.kresko.addKreskoAsset(NAME_ONE, SYMBOL_ONE, ONE, ADDRESS_ONE)).to.be.revertedWith(
                "SYMBOL_NOT_VALID",
            );
        });

        describe("Cannot add kresko assets with invalid parameters", function () {
            it("invalid asset name", async function () {
                await expect(this.kresko.addKreskoAsset("", SYMBOL_TWO, ONE, ADDRESS_ONE)).to.be.revertedWith(
                    "NULL_STRING",
                );
            });
            it("invalid asset symbol", async function () {
                await expect(this.kresko.addKreskoAsset(NAME_TWO, "", ONE, ADDRESS_ONE)).to.be.revertedWith(
                    "NULL_STRING",
                );
            });
            it("invalid k factor", async function () {
                await expect(
                    this.kresko.addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE.sub(1), ADDRESS_ONE),
                ).to.be.revertedWith("INVALID_FACTOR");
            });
            it("invalid oracle address", async function () {
                await expect(this.kresko.addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_ZERO)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
        });

        describe("Cannot update kresko assets with invalid parameters", function () {
            it("reverts when setting the k factor to less than 1", async function () {
                await expect(
                    this.kresko.updateKreskoAssetFactor(this.deployedAssetAddress, ONE.sub(1)),
                ).to.be.revertedWith("INVALID_FACTOR");
            });
            it("reverts when setting the oracle address to the zero address", async function () {
                await expect(
                    this.kresko.updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_ZERO),
                ).to.be.revertedWith("ZERO_ADDRESS");
            });
        });

        it("should allow owner to add new kresko assets", async function () {
            const tx: any = await this.kresko.addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_TWO);
            let events: any = await extractEventFromTxReceipt(tx, "KreskoAssetAdded");

            const asset = await this.kresko.kreskoAssets(events[0].args.kreskoAsset);
            expect(asset.kFactor.rawValue).to.equal(ONE.toString());
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should allow owner to update factor", async function () {
            await this.kresko.updateKreskoAssetFactor(this.deployedAssetAddress, ONE);

            const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
            expect(asset.kFactor.rawValue).to.equal(ONE.toString());
        });

        it("should allow owner to update oracle address", async function () {
            await this.kresko.updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_TWO);

            const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should not allow non-owner to add assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_TWO),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should not allow non-owner to update assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).updateKreskoAssetFactor(this.deployedAssetAddress, ZERO_POINT_FIVE),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(
                this.kresko.connect(this.userOne).updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_TWO),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Kresko asset minting and burning", function () {
        beforeEach(async function () {
            // Deploy primary Kresko contract
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>(
                await deployContract(this.signers.admin, kreskoArtifact, [
                    BURN_FEE,
                    CLOSE_FACTOR,
                    FEE_RECIPIENT_ADDRESS,
                    LIQUIDATION_INCENTIVE,
                    MINIMUM_COLLATERALIZATION_RATIO,
                ])
            );

            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetInfos = await Promise.all([
                addNewKreskoAsset(this.kresko, NAME_ONE, SYMBOL_ONE, 1, 5), // kFactor = 1, price = $5.00
                addNewKreskoAsset(this.kresko, NAME_TWO, SYMBOL_TWO, 1.1, 500), // kFactor = 1.1, price = $500
            ]);

            // Deploy and whitelist collateral assets
            this.collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);
            // Give userOne a balance of 1000 for the collateral asset.
            this.initialUserCollateralBalance = parseEther("1000");
            await this.collateralAssetInfo.collateralAsset.setBalanceOf(
                this.userOne.address,
                this.initialUserCollateralBalance,
            );
            // userOne deposits 100 of the collateral asset.
            // This gives an account collateral value of:
            // 100 * 0.8 * 123.45 = 9,876
            this.collateralDepositAmount = parseEther("100");
            await this.kresko
                .connect(this.userOne)
                .depositCollateral(this.collateralAssetInfo.collateralAsset.address, this.collateralDepositAmount);
        });

        describe("Minting assets", function () {
            it("should allow users to mint whitelisted Kresko assets backed by collateral", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = 500;
                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAssetAddress, mintAmount);

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMinted = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAssetAddress);
                expect(amountMinted).to.equal(mintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalance = await kreskoAsset.balanceOf(this.userOne.address);
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
                const mintedKreskoAssetsInitial = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = 50;
                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAssetAddress, firstMintAmount);

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAssetAddress);
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await kreskoAsset.balanceOf(this.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                // Mint Kresko asset
                const secondMintAmount = 70;
                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAssetAddress, secondMintAmount);

                // Confirm the array of the user's minted Kresko assets is unchanged
                const mintedKreskoAssetsFinal = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([kreskoAssetAddress]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedFinal = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAssetAddress);
                expect(amountMintedFinal).to.equal(firstMintAmount + secondMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await kreskoAsset.balanceOf(this.userOne.address);
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
                const mintedKreskoAssetsInitial = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = 10;
                await this.kresko.connect(this.userOne).mintKreskoAsset(firstKreskoAssetAddress, firstMintAmount);

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([firstKreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await this.kresko.kreskoAssetDebt(
                    this.userOne.address,
                    firstKreskoAssetAddress,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await firstKreskoAsset.balanceOf(this.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await firstKreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                const secondKreskoAsset = this.kreskoAssetInfos[1].kreskoAsset;
                const secondKreskoAssetAddress = secondKreskoAsset.address;

                // Mint Kresko asset
                const secondMintAmount = 1;
                await this.kresko.connect(this.userOne).mintKreskoAsset(secondKreskoAssetAddress, secondMintAmount);

                // Confirm that the second address has been pushed to the array of the user's minted Kresko assets
                const mintedKreskoAssetsFinal = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([firstKreskoAssetAddress, secondKreskoAssetAddress]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedAssetTwo = await this.kresko.kreskoAssetDebt(
                    this.userOne.address,
                    secondKreskoAssetAddress,
                );
                expect(amountMintedAssetTwo).to.equal(secondMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await secondKreskoAsset.balanceOf(this.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedAssetTwo);

                // Confirm that the Kresko asset's total supply increased as expected
                const secondKreskoAssetTotalSupply = await secondKreskoAsset.totalSupply();
                expect(secondKreskoAssetTotalSupply).to.equal(secondMintAmount);
            });

            it("should not allow users to mint non-whitelisted Kresko assets", async function () {
                // Attempt to mint a non-deployed, non-whitelisted Kresko asset
                await expect(this.kresko.connect(this.userOne).mintKreskoAsset(ADDRESS_TWO, 5)).to.be.revertedWith(
                    "ASSET_NOT_VALID",
                );
            });

            it("should not allow users to mint Kresko assets over their collateralization ratio limit", async function () {
                // The account collateral value is 9,876
                // Attempt to mint an amount that would put the account's min collateral value
                // above that.
                // Minting 1335 of the krAsset at index 0 will give a min collateral
                // value of 1335 * 1 * 5 * 1.5 = 10,012.5
                const mintAmount = parseEther("1335");
                await expect(
                    this.kresko
                        .connect(this.userOne)
                        .mintKreskoAsset(this.kreskoAssetInfos[0].kreskoAsset.address, mintAmount),
                ).to.be.revertedWith("INSUFFICIENT_COLLATERAL");
            });
        });

        describe("Burning kresko assets", function () {
            beforeEach(async function () {
                // Mint Kresko asset
                this.mintAmount = toFixedPoint(500);
                await this.kresko
                    .connect(this.userOne)
                    .mintKreskoAsset(this.kreskoAssetInfos[0].kreskoAsset.address, this.mintAmount);

                // Approve tokens to Kresko contract in advance of burning
                await this.kreskoAssetInfos[0].kreskoAsset
                    .connect(this.userOne)
                    .approve(this.kresko.address, this.mintAmount);
            });

            it("should allow users to return some of their Kresko asset balances", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();

                // Burn Kresko asset
                const burnAmount = toFixedPoint(200);
                const kreskoAssetIndex = 0;
                await this.kresko
                    .connect(this.userOne)
                    .burnKreskoAsset(kreskoAssetAddress, burnAmount, kreskoAssetIndex);

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await kreskoAsset.balanceOf(this.userOne.address);
                expect(userBalance).to.equal(this.mintAmount.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([kreskoAssetAddress]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAssetAddress);
                expect(userDebt).to.equal(this.mintAmount.sub(burnAmount));
            });

            it("should allow users to return their full balance of a Kresko asset", async function () {
                const kreskoAsset = this.kreskoAssetInfos[0].kreskoAsset;
                const kreskoAssetAddress = kreskoAsset.address;

                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();

                // Burn Kresko asset
                const kreskoAssetIndex = 0;
                await this.kresko
                    .connect(this.userOne)
                    .burnKreskoAsset(kreskoAssetAddress, this.mintAmount, kreskoAssetIndex);

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await kreskoAsset.balanceOf(this.userOne.address);
                expect(userBalance).to.equal(0);

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));

                // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
                const mintedKreskoAssetsAfter = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAssetAddress);
                expect(userDebt).to.equal(0);
            });

            it("should not allow users to return an amount of 0", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;

                await expect(
                    this.kresko.connect(this.userOne).burnKreskoAsset(kreskoAssetAddress, 0, kreskoAssetIndex),
                ).to.be.revertedWith("AMOUNT_ZERO");
            });

            it("should not allow users to return more kresko assets than they hold as debt", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;
                const burnAmount = this.mintAmount.add(1);

                await expect(
                    this.kresko.connect(this.userOne).burnKreskoAsset(kreskoAssetAddress, burnAmount, kreskoAssetIndex),
                ).to.be.revertedWith("AMOUNT_TOO_HIGH");
            });

            it("should not allow users to return Kresko assets they have not approved", async function () {
                const secondMintAmount = 1;
                const burnAmount = this.mintAmount.add(secondMintAmount);
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;

                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAssetAddress, secondMintAmount);

                const kreskoAssetIndex = 0;
                await expect(
                    this.kresko.connect(this.userOne).burnKreskoAsset(kreskoAssetAddress, burnAmount, kreskoAssetIndex),
                ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
            });

            describe("Protocol burn fee", async function () {
                const singleFeePaymentTest = async function (this: any, collateralAssetInfo: any) {
                    const kreskoAssetIndex = 0;
                    const kreskoAssetInfo = this.kreskoAssetInfos[kreskoAssetIndex];

                    const burnAmount = toFixedPoint(200);
                    const burnValue = fixedPointMul(kreskoAssetInfo.oraclePrice, burnAmount);

                    const expectedFeeValue = fixedPointMul(burnValue, BURN_FEE);
                    let expectedCollateralFeeAmount = collateralAssetInfo.fromFixedPoint(
                        fixedPointDiv(expectedFeeValue, collateralAssetInfo.oraclePrice),
                    );

                    // Get the balances prior to the fee being charged.
                    const kreskoCollateralAssetBalanceBefore = await collateralAssetInfo.collateralAsset.balanceOf(
                        this.kresko.address,
                    );
                    const feeRecipientCollateralAssetBalanceBefore =
                        await collateralAssetInfo.collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS);

                    const burnReceipt = await this.kresko
                        .connect(this.userOne)
                        .burnKreskoAsset(kreskoAssetInfo.kreskoAsset.address, burnAmount, kreskoAssetIndex);

                    // Get the balances after the fees have been charged.
                    const kreskoCollateralAssetBalanceAfter = await collateralAssetInfo.collateralAsset.balanceOf(
                        this.kresko.address,
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
                    const events = await extractEventFromTxReceipt(burnReceipt, "BurnFeePaid");
                    expect(events!.length).to.equal(1);
                    const eventArgs = events![0].args!;
                    expect(eventArgs.account).to.equal(this.userOne.address);
                    expect(eventArgs.paymentCollateralAsset).to.equal(collateralAssetInfo.collateralAsset.address);
                    expect(eventArgs.paymentAmount).to.equal(expectedCollateralFeeAmount);
                    expect(eventArgs.paymentValue).to.equal(expectedFeeValue);
                };

                const atypicalCollateralDecimalsTest = async function (this: any, decimals: number) {
                    const collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 10, decimals);
                    // Give userOne a balance for the collateral asset.
                    await collateralAssetInfo.collateralAsset.setBalanceOf(
                        this.userOne.address,
                        collateralAssetInfo.fromDecimal(1000),
                    );
                    await this.kresko
                        .connect(this.userOne)
                        .depositCollateral(
                            collateralAssetInfo.collateralAsset.address,
                            collateralAssetInfo.fromDecimal(100),
                        );

                    await singleFeePaymentTest.bind(this)(collateralAssetInfo);
                };

                it("should charge the protocol burn fee with a single collateral asset if the deposit amount is sufficient", async function () {
                    await singleFeePaymentTest.bind(this)(this.collateralAssetInfo);
                });

                it("should charge the protocol burn fee across multiple collateral assets if needed", async function () {
                    const price = 10;
                    // Deploy and whitelist collateral assets
                    const collateralAssetInfos = await Promise.all([
                        deployAndWhitelistCollateralAsset(this.kresko, 0.8, price, 18),
                        deployAndWhitelistCollateralAsset(this.kresko, 0.8, price, 18),
                    ]);

                    const smallDepositAmount = parseEther("0.1");
                    const smallDepositValue = smallDepositAmount.mul(price);

                    // Deposit a small amount of the new collateralAssetInfos.
                    for (const collateralAssetInfo of collateralAssetInfos) {
                        // Give userOne a balance for the collateral asset.
                        await collateralAssetInfo.collateralAsset.setBalanceOf(
                            this.userOne.address,
                            this.initialUserCollateralBalance,
                        );

                        await this.kresko
                            .connect(this.userOne)
                            .depositCollateral(collateralAssetInfo.collateralAsset.address, smallDepositAmount);
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
                                kreskoBalance: await info.collateralAsset.balanceOf(this.kresko.address),
                                feeRecipientBalance: await info.collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS),
                            })),
                        );

                    // Get the balances prior to the fee being charged.
                    const collateralAssetBalancesBefore = await getCollateralAssetBalances();

                    const burnReceipt = await this.kresko
                        .connect(this.userOne)
                        .burnKreskoAsset(kreskoAssetInfo.kreskoAsset.address, burnAmount, kreskoAssetIndex);

                    // Get the balances after the fee has been charged.
                    const collateralAssetBalancesAfter = await getCollateralAssetBalances();

                    const events = await extractEventFromTxReceipt(burnReceipt, "BurnFeePaid");

                    // Burn fees are charged against collateral assets in reverse order of the user's
                    // deposited collateral assets array. In other words, collateral assets will be tried
                    // in order of the most recently deposited for the first time -> oldest.
                    // We expect 3 BurnFeePaid events because the first 2 collateral deposits have a value
                    // of $1 and will be taken in their entirety, and the remainder of the fee will be taken
                    // from the large deposit amount of the the very first collateral asset.
                    expect(events!.length).to.equal(3);

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

                        expect(eventArgs.account).to.equal(this.userOne.address);
                        expect(eventArgs.paymentCollateralAsset).to.equal(
                            allCollateralAssetInfos[collateralAssetInfoIndex].collateralAsset.address,
                        );
                        expect(eventArgs.paymentAmount).to.equal(paymentAmount);
                        expect(eventArgs.paymentValue).to.equal(paymentValue);
                    };

                    // Small deposit of the most recently deposited collateral asset
                    expectFeePaid(events![0].args!, 2, smallDepositAmount, smallDepositValue);

                    // Small deposit of the second most recently deposited collateral asset
                    expectFeePaid(events![1].args!, 1, smallDepositAmount, smallDepositValue);

                    // The remainder from the initial large deposit
                    const expectedPaymentValue = expectedFeeValue.sub(smallDepositValue.mul(2));
                    const expectedPaymentAmount = fixedPointDiv(
                        expectedPaymentValue,
                        this.collateralAssetInfo.oraclePrice,
                    );
                    expectFeePaid(events![2].args!, 0, expectedPaymentAmount, expectedPaymentValue);
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

    describe("#setBurnFee", function () {
        const validNewBurnFee = toFixedPoint(0.042);
        it("Sets the burn fee", async function () {
            // Ensure it has the expected initial value
            expect(await this.kresko.burnFee()).to.equal(BURN_FEE);

            await this.kresko.connect(this.signers.admin).setBurnFee(validNewBurnFee);

            expect(await this.kresko.burnFee()).to.equal(validNewBurnFee);
        });

        it("Emits the BurnFeeUpdated event", async function () {
            const receipt = await this.kresko.connect(this.signers.admin).setBurnFee(validNewBurnFee);

            const event = (await extractEventFromTxReceipt(receipt, "BurnFeeUpdated"))![0].args!;
            expect(event.burnFee).to.equal(validNewBurnFee);
        });

        it("Reverts if the burn fee exceeds MAX_BURN_FEE", async function () {
            const newBurnFee = (await this.kresko.MAX_BURN_FEE()).add(1);
            await expect(this.kresko.connect(this.signers.admin).setBurnFee(newBurnFee)).to.be.revertedWith(
                "BURN_FEE_TOO_HIGH",
            );
        });

        it("Reverts if called by a non-owner", async function () {
            await expect(this.kresko.connect(this.userOne).setBurnFee(validNewBurnFee)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });
    });

    describe("#setFeeRecipient", function () {
        const validFeeRecipient = "0xF00D000000000000000000000000000000000000";
        it("Sets the fee recipient", async function () {
            // Ensure it has the expected initial value
            expect(await this.kresko.feeRecipient()).to.equal(FEE_RECIPIENT_ADDRESS);

            await this.kresko.connect(this.signers.admin).setFeeRecipient(validFeeRecipient);

            expect(await this.kresko.feeRecipient()).to.equal(validFeeRecipient);
        });

        it("Emits the UpdateFeeRecipient event", async function () {
            const receipt = await this.kresko.connect(this.signers.admin).setFeeRecipient(validFeeRecipient);

            const event = (await extractEventFromTxReceipt(receipt, "FeeRecipientUpdated"))![0].args!;
            expect(event.feeRecipient).to.equal(validFeeRecipient);
        });

        it("Reverts if the fee recipient is the zero address", async function () {
            await expect(this.kresko.connect(this.signers.admin).setFeeRecipient(ADDRESS_ZERO)).to.be.revertedWith(
                "ZERO_ADDRESS",
            );
        });

        it("Reverts if called by a non-owner", async function () {
            await expect(this.kresko.connect(this.userOne).setFeeRecipient(validFeeRecipient)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });
    });

    describe("Liquidations", function () {
        beforeEach(async function () {
            // Deploy primary Kresko contract
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>(
                await deployContract(this.signers.admin, kreskoArtifact, [
                    BURN_FEE,
                    CLOSE_FACTOR,
                    FEE_RECIPIENT_ADDRESS,
                    LIQUIDATION_INCENTIVE,
                    MINIMUM_COLLATERALIZATION_RATIO,
                ])
            );

            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetInfo = await Promise.all([
                addNewKreskoAsset(this.kresko, NAME_ONE, SYMBOL_ONE, 1, 10), // kFactor = 1, price = $10.00
            ]);

            // Deploy and whitelist collateral assets
            this.collateralAssetInfos = await Promise.all([
                deployAndWhitelistCollateralAsset(this.kresko, 1, 20, 18), // factor = 1, price = $20.00
            ]);

            // Give userOne and userTwo a balance of 1000 for each collateral asset.
            const userAddresses = [this.userOne.address, this.userTwo.address];
            const initialUserCollateralBalance = parseEther("0.00001");
            for (const collateralAssetInfo of this.collateralAssetInfos) {
                for (const userAddress of userAddresses) {
                    await collateralAssetInfo.collateralAsset.setBalanceOf(userAddress, initialUserCollateralBalance);
                }
            }

            // userOne deposits 1000 of the collateral asset
            const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
            const userOneDepositAmount = 1000; // 1000 * $20 = $20,000 in collateral value
            await this.kresko.connect(this.userOne).depositCollateral(collateralAsset.address, userOneDepositAmount);

            // userOne mints 1000 of the Kresko asset
            const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
            const useOneMintAmount = 1000; // 1000 * $10 = $10,000 in debt value
            await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAsset.address, useOneMintAmount);

            // userTwo deposits 10,000 of the collateral asset
            const userTwoDepositAmount = 10000; // 10,000 * $20 = $200,000 in collateral value
            await this.kresko.connect(this.userTwo).depositCollateral(collateralAsset.address, userTwoDepositAmount);

            // userTwo mints 1000 of the Kresko asset
            const userTwoMintAmount = 1000; // 1000 * $10 = $10,000 in debt value
            await this.kresko.connect(this.userTwo).mintKreskoAsset(kreskoAsset.address, userTwoMintAmount);
        });

        it("should identify accounts below their minimum collateralization ratio", async function () {
            // Initial debt value: (1000 * $10) = $10,000
            const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
            const userDebtAmount = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address);
            const userDebtAmountInUSD = await this.kresko.getKrAssetValue(kreskoAsset.address, userDebtAmount);
            expect(userDebtAmountInUSD.rawValue).to.equal(10000);

            // Initial collateral value: (1000 * $20) = $20,000
            const initialUserCollateralAmountInUSD = await this.kresko.getAccountCollateralValue(this.userOne.address);
            expect(initialUserCollateralAmountInUSD.rawValue).to.equal(20000);

            // The account should be NOT liquidatable as collateral value ($20,000) >= min collateral value ($15,000)
            const initialCanLiquidate = await this.kresko.isAccountLiquidatable(this.userOne.address);
            expect(initialCanLiquidate).to.equal(false);

            // Change collateral asset's USD value from $20 to $11
            const oracle = this.collateralAssetInfos[0].oracle;
            const updatedCollateralPrice = 11;
            const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
            await oracle.setValue(fixedPointOraclePrice);

            // Updated collateral value: (1000 * $11) = $11,000
            const userCollateralAmountInUSD = await this.kresko.getAccountCollateralValue(this.userOne.address);
            expect(userCollateralAmountInUSD.rawValue).to.equal(11000);

            // The account should be liquidatable as collateral value ($10,000) < min collateral value ($15,000)
            const canLiquidate = await this.kresko.isAccountLiquidatable(this.userOne.address);
            expect(canLiquidate).to.equal(true);
        });

        it("should allow unhealthy accounts to be liquidated", async function () {
            // Change collateral asset's USD value from $20 to $11
            const oracle = this.collateralAssetInfos[0].oracle;
            const updatedCollateralPrice = 11;
            const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
            await oracle.setValue(fixedPointOraclePrice);

            // Confirm we can liquidate this account
            const canLiquidate = await this.kresko.isAccountLiquidatable(this.userOne.address);
            expect(canLiquidate).to.equal(true);

            // Fetch userOne's debt and collateral balances prior to liquidation
            const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
            const beforeUserOneCollateralAmount = await this.kresko.collateralDeposits(
                this.userOne.address,
                collateralAsset.address,
            );
            const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
            const beforeUserOneDebtAmount = await this.kresko.kreskoAssetDebt(
                this.userOne.address,
                kreskoAsset.address,
            );

            // Fetch userTwo's collateral and kresko asset balance
            const beforeUserTwoCollateralBalance = await collateralAsset.balanceOf(this.userTwo.address);
            const beforeUserTwoKreskoAssetBalance = await kreskoAsset.balanceOf(this.userTwo.address);

            // Fetch contract's collateral balance
            const beforeKreskoCollateralBalance = await collateralAsset.balanceOf(this.kresko.address);

            // Fetch the Kresko asset's total supply
            const beforeKreskoAssetTotalSupply = await kreskoAsset.totalSupply();

            // userTwo holds Kresko assets that can be used to repay userOne's loan
            const repayAmount = 100;
            await kreskoAsset.connect(this.userTwo).approve(this.kresko.address, repayAmount);

            const mintedKreskoAssetIndex = 0;
            const depositedCollateralAssetIndex = 0;
            await this.kresko
                .connect(this.userTwo)
                .liquidate(
                    this.userOne.address,
                    kreskoAsset.address,
                    repayAmount,
                    collateralAsset.address,
                    mintedKreskoAssetIndex,
                    depositedCollateralAssetIndex,
                );

            // Confirm that the liquidated user's debt amount has decreased by the repaid amount
            const afterUserOneDebtAmount = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address);
            expect(afterUserOneDebtAmount).to.equal(beforeUserOneDebtAmount - repayAmount);
            // Confirm that some of the liquidated user's collateral has been seized
            const afterUserOneCollateralAmount = await this.kresko.collateralDeposits(
                this.userOne.address,
                collateralAsset.address,
            );
            expect(Number(afterUserOneCollateralAmount)).to.be.lessThan(Number(beforeUserOneCollateralAmount));

            // Confirm that userTwo's kresko asset balance has decreased by the repaid amount
            const afterUserTwoKreskoAssetBalance = await kreskoAsset.balanceOf(this.userTwo.address);
            expect(afterUserTwoKreskoAssetBalance).to.equal(beforeUserTwoKreskoAssetBalance - repayAmount);

            // Confirm that userTwo has received some collateral from the contract
            const afterUserTwoCollateralBalance = await collateralAsset.balanceOf(this.userTwo.address);
            expect(Number(afterUserTwoCollateralBalance)).to.be.greaterThan(Number(beforeUserTwoCollateralBalance));

            // Confirm that Kresko contract's collateral balance has decreased.
            const afterKreskoCollateralBalance = await collateralAsset.balanceOf(this.kresko.address);
            expect(Number(afterKreskoCollateralBalance)).to.be.lessThan(Number(beforeKreskoCollateralBalance));

            // Confirm that Kresko asset's total supply has decreased.
            const afterKreskoAssetTotalSupply = await kreskoAsset.totalSupply();
            expect(afterKreskoAssetTotalSupply).to.equal(beforeKreskoAssetTotalSupply - repayAmount);
        });

        it("should not allow the liquidations of healthy accounts", async function () {
            const repayAmount = 100;
            await this.kreskoAssetInfo[0].kreskoAsset.connect(this.userTwo).approve(this.kresko.address, repayAmount);

            const mintedKreskoAssetIndex = 0;
            const depositedCollateralAssetIndex = 0;
            await expect(
                this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        this.kreskoAssetInfo[0].kreskoAsset.address,
                        repayAmount,
                        this.collateralAssetInfos[0].collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
            ).to.be.revertedWith("NOT_LIQUIDATABLE");
        });

        it("should not allow repayments of 0", async function () {
            // Change collateral asset's USD value from $20 to $11
            const updatedCollateralPrice = 11;
            const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
            await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

            // userTwo holds Kresko assets that can be used to repay userOne's loan
            const approveAmount = 1000;
            await this.kreskoAssetInfo[0].kreskoAsset.connect(this.userTwo).approve(this.kresko.address, approveAmount);

            const repayAmount = 0;
            const mintedKreskoAssetIndex = 0;
            const depositedCollateralAssetIndex = 0;
            await expect(
                this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        this.kreskoAssetInfo[0].kreskoAsset.address,
                        repayAmount,
                        this.collateralAssetInfos[0].collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
            ).to.be.revertedWith("REPAY_AMOUNT_TOO_SMALL");
        });

        it("should not allow repayments over the max repay amount", async function () {
            // Change collateral asset's USD value from $20 to $11
            const updatedCollateralPrice = 11;
            const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
            await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

            // userTwo holds Kresko assets that can be used to repay userOne's loan
            const repayAmount = 1000;
            await this.kreskoAssetInfo[0].kreskoAsset.connect(this.userTwo).approve(this.kresko.address, repayAmount);

            const mintedKreskoAssetIndex = 0;
            const depositedCollateralAssetIndex = 0;
            await expect(
                this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        this.kreskoAssetInfo[0].kreskoAsset.address,
                        repayAmount,
                        this.collateralAssetInfos[0].collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
            ).to.be.revertedWith("REPAY_AMOUNT_TOO_LARGE");
        });

        it("should not allow liquidations if liquidator hasn't approved Kresko assets to the contract", async function () {
            // Change collateral asset's USD value from $20 to $11
            const updatedCollateralPrice = 11;
            const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
            await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

            const repayAmount = 100;

            const mintedKreskoAssetIndex = 0;
            const depositedCollateralAssetIndex = 0;
            await expect(
                this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        this.kreskoAssetInfo[0].kreskoAsset.address,
                        repayAmount,
                        this.collateralAssetInfos[0].collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                    ),
            ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });
    });
});
