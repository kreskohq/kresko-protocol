import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { BigNumber, Contract, ContractTransaction } from "ethers";

import { toFixedPoint, fixedPointMul } from "../utils/fixed-point"
import { extractEventFromTxReceipt } from "../utils/events"

import { BasicOracle } from "../typechain/BasicOracle";
import { Kresko } from "../typechain/Kresko";
import { MockToken } from "../typechain/MockToken";
import { Signers } from "../types";
import { ERC20__factory } from "../typechain";

const ADDRESS_ZERO = hre.ethers.constants.AddressZero;
const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
const SYMBOL_ONE = "ONE";
const SYMBOL_TWO = "TWO";
const NAME_ONE = "One Kresko Asset";
const NAME_TWO = "Two Kresko Asset";
const COLLATERALIZATION_RATIO: number = 150;

const { parseEther } = hre.ethers.utils;
const { deployContract } = hre.waffle;

const ONE = toFixedPoint(1);
const ZERO_POINT_FIVE = toFixedPoint(0.5);

async function deployAndWhitelistCollateralAsset(kresko: Contract, collateralFactor: number, oraclePrice: number) {
    const mockTokenArtifact: Artifact = await hre.artifacts.readArtifact("MockToken");
    const collateralAsset = <MockToken>await deployContract(kresko.signer, mockTokenArtifact);

    const signerAddress = await kresko.signer.getAddress();
    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(kresko.signer, basicOracleArtifact, [signerAddress]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);

    const fixedPointCollateralFactor = toFixedPoint(collateralFactor);
    await kresko.addCollateralAsset(
        collateralAsset.address,
        fixedPointCollateralFactor,
        oracle.address
    );

    return {
        collateralAsset,
        oracle,
        factor: fixedPointCollateralFactor,
        oraclePrice: fixedPointOraclePrice
    };
}

async function addNewKreskoAsset(kresko: Contract, name: string, symbol: string, kFactor: number, oraclePrice: number) {
    const signerAddress = await kresko.signer.getAddress();
    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(kresko.signer, basicOracleArtifact, [signerAddress]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);

    const fixedPointKFactor = toFixedPoint(kFactor);
    const tx: ContractTransaction = await kresko.addKreskoAsset(
        name,
        symbol,
        fixedPointKFactor,
        oracle.address
    );
    let events: any = await extractEventFromTxReceipt(tx, "AddKreskoAsset");
    return events[0].args.assetAddress;
}

describe("Kresko", function () {
    beforeEach(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];

        const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
        this.kresko = <Kresko>await deployContract(this.signers.admin, kreskoArtifact, [COLLATERALIZATION_RATIO]);
    });

    describe("Collateral Assets", function () {
        beforeEach(async function () {
            await this.kresko.addCollateralAsset(ADDRESS_ONE, ONE, ADDRESS_ONE);
        });

        it("Cannot add collateral assets more than once", async function () {
            await expect(this.kresko.addCollateralAsset(ADDRESS_ONE, ONE, ADDRESS_ONE)).to.be.revertedWith(
                "ASSET_EXISTS",
            );
        });

        describe("Cannot add collateral assets with invalid parameters", function () {
            it("invalid asset address", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_ZERO, ONE, ADDRESS_ONE)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
            it("invalid factor", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_TWO, 0, ADDRESS_ONE)).to.be.revertedWith(
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
            it("invalid asset factor", async function () {
                await expect(this.kresko.updateCollateralFactor(ADDRESS_ONE, 0)).to.be.revertedWith("INVALID_FACTOR");
            });
            it("invalid oracle address", async function () {
                await expect(this.kresko.updateCollateralOracle(ADDRESS_ONE, ADDRESS_ZERO)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
        });

        it("should allow owner to add assets", async function () {
            await this.kresko.addCollateralAsset(ADDRESS_TWO, ONE, ADDRESS_TWO);

            const asset = await this.kresko.collateralAssets(ADDRESS_TWO);
            expect(asset.factor.rawValue).to.equal(ONE.toString());
            expect(asset.oracle).to.equal(ADDRESS_TWO);
            expect(asset.exists).to.be.true;
        });

        it("should allow owner to update factor", async function () {
            await this.kresko.updateCollateralFactor(ADDRESS_ONE, ZERO_POINT_FIVE);

            const asset = await this.kresko.collateralAssets(ADDRESS_ONE);
            expect(asset.factor.rawValue).to.equal(ZERO_POINT_FIVE);
        });

        it("should allow owner to update oracle address", async function () {
            await this.kresko.updateCollateralOracle(ADDRESS_ONE, ADDRESS_TWO);

            const asset = await this.kresko.collateralAssets(ADDRESS_ONE);
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
                deployAndWhitelistCollateralAsset(
                    this.kresko,
                    0.8,
                    123.45
                ),
                deployAndWhitelistCollateralAsset(
                    this.kresko,
                    0.7,
                    420.123
                ),
            ])

            // Give userOne a balance of 1000 for each collateral asset.
            this.initialUserCollateralBalance = parseEther("1000");
            for (const collateralAssetInfo of this.collateralAssetInfos) {
                await collateralAssetInfo.collateralAsset.setBalanceOf(this.userOne.address, this.initialUserCollateralBalance);
            }
        });

        describe("Depositing collateral", function () {
            it("should allow an account to deposit whitelisted collateral", async function() {
                // Initially, the array of the user's deposited collateral assets should be empty.
                const depositedCollateralAssetsBefore = await this.kresko.getDepositedCollateralAssets(this.userOne.address);
                expect(depositedCollateralAssetsBefore).to.deep.equal([]);

                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                // Deposit it
                const depositAmount = parseEther("123.321")
                await this.kresko.connect(this.userOne).depositCollateral(
                    collateralAsset.address,
                    depositAmount
                );

                // Confirm the array of the user's deposited collateral assets has been pushed to.
                const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(this.userOne.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await this.kresko.collateralDeposits(this.userOne.address, collateralAsset.address);
                expect(amountDeposited).to.equal(depositAmount);

                // Confirm the amount as been transferred from the user into Kresko.sol
                const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                expect(kreskoBalance).to.equal(depositAmount);
                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                expect(userOneBalance).to.equal(this.initialUserCollateralBalance.sub(depositAmount));
            });

            it("should allow an account to deposit more collateral to an existing deposit", async function() {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                // Deposit an initial amount
                const depositAmount0 = parseEther("123.321");
                await this.kresko.connect(this.userOne).depositCollateral(
                    collateralAsset.address,
                    depositAmount0
                );

                // Deposit a secound amount
                const depositAmount1 = parseEther("321.123");
                await this.kresko.connect(this.userOne).depositCollateral(
                    collateralAsset.address,
                    depositAmount1
                );

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(this.userOne.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset.address]);

                // Confirm the amount deposited is recorded for the user.
                const amountDeposited = await this.kresko.collateralDeposits(this.userOne.address, collateralAsset.address);
                expect(amountDeposited).to.equal(depositAmount0.add(depositAmount1));
            });

            it("should allow an account to have deposited multiple collateral assets", async function() {
                const collateralAsset0 = this.collateralAssetInfos[0].collateralAsset;
                const collateralAsset1 = this.collateralAssetInfos[1].collateralAsset;

                // Deposit a collateral asset.
                const depositAmount0 = parseEther("123.321");
                await this.kresko.connect(this.userOne).depositCollateral(
                    collateralAsset0.address,
                    depositAmount0
                );

                // Deposit a different collateral asset.
                const depositAmount1 = parseEther("321.123");
                await this.kresko.connect(this.userOne).depositCollateral(
                    collateralAsset1.address,
                    depositAmount1
                );

                // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(this.userOne.address);
                expect(depositedCollateralAssetsAfter).to.deep.equal([collateralAsset0.address, collateralAsset1.address]);
            });

            it("should revert if depositing collateral that has not been whitelisted", async function() {
                await expect(
                    this.kresko.connect(this.userOne).depositCollateral(
                        ADDRESS_ONE,
                        parseEther("123")
                    )
                ).to.be.revertedWith("ASSET_NOT_VALID");
            });

            it("should revert if depositing an amount of 0", async function() {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                await expect(
                    this.kresko.connect(this.userOne).depositCollateral(
                        collateralAsset.address,
                        0
                    )
                ).to.be.revertedWith("AMOUNT_ZERO");
            });
        });

        describe("Withdrawing collateral", async function() {
            beforeEach(async function() {
                // Have userOne deposit 100 of each collateral asset
                this.initialDepositAmount = parseEther("100");
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    await this.kresko.connect(this.userOne).depositCollateral(
                        collateralAssetInfo.collateralAsset.address,
                        this.initialDepositAmount
                    );
                }
            });

            it("should allow an account to withdraw their entire deposit", async function() {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                await this.kresko.connect(this.userOne).withdrawCollateral(
                    collateralAsset.address,
                    this.initialDepositAmount,
                    0 // The index of collateralAsset.address in the account's depositedCollateralAssets
                );
                // Ensure that the collateral asset is removed from the account's deposited collateral
                // assets array.
                const depositedCollateralAssets = await this.kresko.getDepositedCollateralAssets(this.userOne.address);
                expect(depositedCollateralAssets).to.deep.equal([this.collateralAssetInfos[1].collateralAsset.address]);

                // Ensure the change in the user's deposit is recorded.
                const amountDeposited = await this.kresko.collateralDeposits(this.userOne.address, collateralAsset.address);
                expect(amountDeposited).to.equal(0);

                // Ensure the amount transferred is correct
                const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                expect(kreskoBalance).to.equal(BigNumber.from(0));
                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                expect(userOneBalance).to.equal(this.initialUserCollateralBalance);
            });

            it("should allow an account to withdraw a portion of their deposit", async function() {
                const amountToWithdraw = parseEther("49.43");
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                await this.kresko.connect(this.userOne).withdrawCollateral(
                    collateralAsset.address,
                    amountToWithdraw,
                    0 // The index of collateralAsset.address in the account's depositedCollateralAssets
                );

                // Ensure the change in the user's deposit is recorded.
                const amountDeposited = await this.kresko.collateralDeposits(this.userOne.address, collateralAsset.address);
                expect(amountDeposited).to.equal(this.initialDepositAmount.sub(amountToWithdraw));

                // Ensure that the collateral asset is still in the account's deposited collateral
                // assets array.
                const depositedCollateralAssets = await this.kresko.getDepositedCollateralAssets(this.userOne.address);
                expect(depositedCollateralAssets).to.deep.equal([
                    this.collateralAssetInfos[0].collateralAsset.address,
                    this.collateralAssetInfos[1].collateralAsset.address
                ]);

                const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                expect(kreskoBalance).to.equal(this.initialDepositAmount.sub(amountToWithdraw));
                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                expect(userOneBalance).to.equal(this.initialUserCollateralBalance
                    .sub(this.initialDepositAmount)
                    .add(amountToWithdraw)
                );
            });

            it("should revert if withdrawing the entire deposit but the depositedCollateralAssetIndex is incorrect", async function() {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                await expect(
                    this.kresko.connect(this.userOne).withdrawCollateral(
                        collateralAsset.address,
                        this.initialDepositAmount,
                        1 // Incorrect index
                    )
                ).to.be.revertedWith("WRONG_DEPOSITED_COLLATERAL_ASSETS_INDEX");
            });

            it("should revert if withdrawing more than the user's deposit", async function() {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                await expect(
                    this.kresko.connect(this.userOne).withdrawCollateral(
                        collateralAsset.address,
                        this.initialDepositAmount + 1,
                        0
                    )
                ).to.be.revertedWith("AMOUNT_TOO_HIGH");
            });

            it("should revert if withdrawing an amount of 0", async function() {
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                await expect(
                    this.kresko.connect(this.userOne).withdrawCollateral(
                        collateralAsset.address,
                        0,
                        0
                    )
                ).to.be.revertedWith("AMOUNT_ZERO");
            });
        });

        describe("Collateral value", async function() {
            beforeEach(async function() {
                // Have userOne deposit 100 of each collateral asset
                this.initialDepositAmountEth = BigNumber.from(100)
                const initialDepositAmountWei = parseEther(this.initialDepositAmountEth.toString());
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    await this.kresko.connect(this.userOne).depositCollateral(
                        collateralAssetInfo.collateralAsset.address,
                        initialDepositAmountWei
                    );
                }
            });

            it("returns the collateral value according to a user's deposits and their oracle prices", async function() {
                let expectedCollateralValue = BigNumber.from(0);
                for (const collateralAssetInfo of this.collateralAssetInfos) {
                    expectedCollateralValue = expectedCollateralValue.add(
                        fixedPointMul(
                            this.initialDepositAmountEth.mul(collateralAssetInfo.factor),
                            collateralAssetInfo.oraclePrice
                        )
                    );
                }

                const collateralValue = await this.kresko.getCollateralValue(this.userOne.address);
                expect(collateralValue.rawValue).to.equal(expectedCollateralValue);
            })

            it("returns 0 if the user has not deposited any collateral", async function() {
                const collateralValue = await this.kresko.getCollateralValue(this.userTwo.address);
                expect(collateralValue.rawValue).to.equal(BigNumber.from(0));
            })
        });
    });

    describe("Kresko Assets", function () {
        beforeEach(async function () {
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>await deployContract(this.signers.admin, kreskoArtifact, [COLLATERALIZATION_RATIO]);

            const tx: ContractTransaction = await this.kresko.addKreskoAsset(NAME_ONE, SYMBOL_ONE, ONE, ADDRESS_ONE);
            let events: any = await extractEventFromTxReceipt(tx, "AddKreskoAsset");
            this.deployedAssetAddress = events[0].args.assetAddress;
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
                await expect(this.kresko.addKreskoAsset(NAME_TWO, SYMBOL_TWO, 0, ADDRESS_ONE)).to.be.revertedWith(
                    "INVALID_FACTOR",
                );
            });
            it("invalid oracle address", async function () {
                await expect(this.kresko.addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_ZERO)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
        });

        describe("Cannot update kresko assets with invalid parameters", function () {
            it("invalid k factor", async function () {
                await expect(this.kresko.updateKreskoAssetFactor(this.deployedAssetAddress, 0)).to.be.revertedWith("INVALID_FACTOR");
            });
            it("invalid oracle address", async function () {
                await expect(this.kresko.updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_ZERO)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
        });

        it("should allow owner to add new kresko assets", async function () {
            const tx: any =  await this.kresko.addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_TWO);
            let events: any = await extractEventFromTxReceipt(tx, "AddKreskoAsset");

            const asset = await this.kresko.kreskoAssets(events[0].args.assetAddress);
            expect(asset.kFactor.rawValue).to.equal(ONE.toString());
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should allow owner to update factor", async function () {
            await this.kresko.updateKreskoAssetFactor(this.deployedAssetAddress, ZERO_POINT_FIVE);

            const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
            expect(asset.kFactor.rawValue).to.equal(ZERO_POINT_FIVE.toString());
        });

        it("should allow owner to update oracle address", async function () {
            await this.kresko.updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_TWO);

            const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should not allow non-owner to add assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).addKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_TWO)
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

    describe("Kresko asset minting", function () {
        beforeEach(async function () {
            // Deploy primary Kresko contract
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>await deployContract(this.signers.admin, kreskoArtifact, [COLLATERALIZATION_RATIO]);

            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetAddresses = await Promise.all([
                addNewKreskoAsset(this.kresko, NAME_ONE, SYMBOL_ONE, 1, 5), // kFactor = 1, price = $5.00
                addNewKreskoAsset(this.kresko, NAME_TWO, SYMBOL_TWO, 0.9, 500), // kFactor = 0.9, price = $500
            ]);

            this.kreskoAssets = [];
            for (const kreskoAssetAddress of this.kreskoAssetAddresses) {
                const KreskoAssetContract = await hre.ethers.getContractFactory("KreskoAsset");
                const kreskoAsset = await KreskoAssetContract.attach(kreskoAssetAddress)
                this.kreskoAssets.push(kreskoAsset);
            }

            // Deploy and whitelist collateral assets
            this.collateralAssetInfos = await Promise.all([
                deployAndWhitelistCollateralAsset(
                    this.kresko,
                    0.8,
                    123.45
                ),
                deployAndWhitelistCollateralAsset(
                    this.kresko,
                    0.7,
                    420.123
                ),
            ])

            // Give userOne a balance of 1000 for each collateral asset.
            this.initialUserCollateralBalance = parseEther("1000");
            for (const collateralAssetInfo of this.collateralAssetInfos) {
                await collateralAssetInfo.collateralAsset.setBalanceOf(this.userOne.address, this.initialUserCollateralBalance);
            }

            // userOne deposits some collateral
            const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
            const depositAmount = parseEther("100")
            await this.kresko.connect(this.userOne).depositCollateral(
                collateralAsset.address,
                depositAmount
            );
        });

        describe("Minting assets", function () {
            it("should allow users to mint whitelisted Kresko assets backed by collateral", async function() {
                const kreskoAsset = this.kreskoAssets[0];
                const kreskoAssetAddress = this.kreskoAssetAddresses[0];

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = 500;
                await this.kresko.connect(this.userOne).mintKreskoAsset(
                    kreskoAssetAddress,
                    mintAmount
                );

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
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore
                    .add(mintAmount)
                );
            });

            it("should allow successive, valid mints of the same Kresko asset", async function() {
                const kreskoAsset = this.kreskoAssets[0];
                const kreskoAssetAddress = this.kreskoAssetAddresses[0];

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await kreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = 50;
                await this.kresko.connect(this.userOne).mintKreskoAsset(
                    kreskoAssetAddress,
                    firstMintAmount
                );

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
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial
                    .add(firstMintAmount)
                );

                // ------------------------ Second mint ------------------------
                // Mint Kresko asset
                const secondMintAmount = 70;
                await this.kresko.connect(this.userOne).mintKreskoAsset(
                    kreskoAssetAddress,
                    secondMintAmount
                );

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
                expect(kreskoAssetTotalSupplyFinal).to.equal(kreskoAssetTotalSupplyAfter
                    .add(secondMintAmount)
                );
            });

            it("should allow users to mint multiple different Kresko assets", async function() {
                const firstKreskoAsset = this.kreskoAssets[0];
                const firstKreskoAssetAddress = this.kreskoAssetAddresses[0];

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await firstKreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = 10;
                await this.kresko.connect(this.userOne).mintKreskoAsset(
                    firstKreskoAssetAddress,
                    firstMintAmount
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([firstKreskoAssetAddress]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await this.kresko.kreskoAssetDebt(this.userOne.address, firstKreskoAssetAddress);
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await firstKreskoAsset.balanceOf(this.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await firstKreskoAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial
                    .add(firstMintAmount)
                );

                // ------------------------ Second mint ------------------------
                const secondKreskoAsset = this.kreskoAssets[1];
                const secondKreskoAssetAddress = this.kreskoAssetAddresses[1];

                // Mint Kresko asset
                const secondMintAmount = 1;
                await this.kresko.connect(this.userOne).mintKreskoAsset(
                    secondKreskoAssetAddress,
                    secondMintAmount
                );

                // Confirm that the second address has been pushed to the array of the user's minted Kresko assets
                const mintedKreskoAssetsFinal = await this.kresko.getMintedKreskoAssets(this.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([firstKreskoAssetAddress, secondKreskoAssetAddress]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedAssetTwo = await this.kresko.kreskoAssetDebt(this.userOne.address, secondKreskoAssetAddress);
                expect(amountMintedAssetTwo).to.equal(secondMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await secondKreskoAsset.balanceOf(this.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedAssetTwo);

                // Confirm that the Kresko asset's total supply increased as expected
                const secondKreskoAssetTotalSupply = await secondKreskoAsset.totalSupply();
                expect(secondKreskoAssetTotalSupply).to.equal(secondMintAmount);
            });

            it("should not allow users to mint non-whitelisted Kresko assets", async function() {
                // Attempt to mint a non-deployed, non-whitelisted Kresko asset
                await expect(this.kresko.connect(this.userOne).mintKreskoAsset(
                    ADDRESS_TWO,
                    5
                )).to.be.revertedWith("ASSET_NOT_VALID");
            });

            it("should not allow users to mint Kresko assets over their collateralization ratio limit", async function() {
                const mintAmount = 2000;
                // Attempt to mint amount greater than allowed: max should be around ~1500
                await expect(this.kresko.connect(this.userOne).mintKreskoAsset(
                    this.kreskoAssetAddresses[0],
                    mintAmount
                )).to.be.revertedWith("INSUFFICIENT_COLLATERAL");
            });
        });
    });
});
