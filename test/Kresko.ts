import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { BigNumber, Contract, ethers } from "ethers";

import { toFixedPoint, fixedPointDiv, fixedPointMul, fromFixedPoint } from "../utils/fixed-point";
import { extractEventFromTxReceipt } from "../utils/events";

import { BasicOracle } from "../typechain/BasicOracle";
import { Kresko } from "../typechain/Kresko";
import { KreskoAsset } from "../typechain/KreskoAsset";
import { MockToken } from "../typechain/MockToken";
import { NonRebasingWrapperToken } from "../typechain/NonRebasingWrapperToken";
import { RebasingToken } from "../typechain/RebasingToken";
import { Signers } from "../types";
import { Result } from "@ethersproject/abi";
import {
    ADDRESS_ONE,
    ADDRESS_TWO,
    ADDRESS_ZERO,
    BURN_FEE,
    CollateralAssetInfo,
    deployContract,
    FEE_RECIPIENT_ADDRESS,
    fromBig,
    LIQUIDATION_INCENTIVE,
    MINIMUM_COLLATERALIZATION_RATIO,
    NAME_ONE,
    NAME_TWO,
    ONE,
    parseEther,
    SYMBOL_ONE,
    SYMBOL_TWO,
    ZERO_POINT_FIVE,
} from "./helper";
import { formatEther } from "@ethersproject/units";
import { ExampleFlashLiquidator, MockWETH10 } from "../typechain";

export async function deployAndWhitelistCollateralAsset(
    kresko: Contract,
    collateralFactor: number,
    oraclePrice: number,
    decimals: number,
    isNonRebasingWrapperToken: boolean = false,
): Promise<CollateralAssetInfo> {
    // Really this is MockToken | NonRebasingWrapperToken, but to avoid type pains
    // just using any.
    let collateralAsset: any;
    let rebasingToken: RebasingToken | undefined;

    if (isNonRebasingWrapperToken) {
        const nwrtInfo = await deployNonRebasingWrapperToken(kresko.signer);
        collateralAsset = nwrtInfo.nonRebasingWrapperToken;
        rebasingToken = nwrtInfo.rebasingToken;
    } else {
        const mockTokenArtifact: Artifact = await hre.artifacts.readArtifact("MockToken");
        collateralAsset = <MockToken>await deployContract(kresko.signer, mockTokenArtifact, [decimals]);
    }

    const signerAddress = await kresko.signer.getAddress();
    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(kresko.signer, basicOracleArtifact, [signerAddress]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);

    const fixedPointCollateralFactor = toFixedPoint(collateralFactor);
    await kresko.addCollateralAsset(
        collateralAsset.address,
        fixedPointCollateralFactor,
        oracle.address,
        isNonRebasingWrapperToken,
    );

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
        rebasingToken,
    };
}

export async function addNewKreskoAssetWithOraclePrice(
    kresko: Contract,
    name: string,
    symbol: string,
    kFactor: number,
    oraclePrice: number,
) {
    const signerAddress = await kresko.signer.getAddress();
    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(kresko.signer, basicOracleArtifact, [signerAddress]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);
    const fixedPointKFactor = toFixedPoint(kFactor);

    const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
    const kreskoAsset = <KreskoAsset>await (
        await hre.upgrades.deployProxy(kreskoAssetFactory, [name, symbol, signerAddress, kresko.address], {
            unsafeAllow: ["constructor"],
        })
    ).deployed();

    await kresko.addKreskoAsset(kreskoAsset.address, symbol, fixedPointKFactor, oracle.address);

    return {
        kreskoAsset,
        oracle,
        oraclePrice: fixedPointOraclePrice,
        kFactor: fixedPointKFactor,
    };
}

export async function deployNonRebasingWrapperToken(signer: ethers.Signer) {
    const rebasingTokenArtifact: Artifact = await hre.artifacts.readArtifact("RebasingToken");
    const rebasingToken = <RebasingToken>await deployContract(signer, rebasingTokenArtifact, [toFixedPoint(1)]);

    const nonRebasingWrapperTokenFactory = await hre.ethers.getContractFactory("NonRebasingWrapperToken");
    const nonRebasingWrapperToken = <NonRebasingWrapperToken>await (
        await hre.upgrades.deployProxy(
            nonRebasingWrapperTokenFactory,
            [rebasingToken.address, "NonRebasingWrapperToken", "NRWT"],
            {
                unsafeAllow: ["constructor"],
            },
        )
    ).deployed();

    return {
        rebasingToken,
        nonRebasingWrapperToken,
    };
}

export async function deployWETH10AsCollateralWithLiquidator(
    Kresko: Kresko,
    signer: SignerWithAddress,
    factor: number,
    oraclePrice: number,
) {
    const WETH10Artifact: Artifact = await hre.artifacts.readArtifact("MockWETH10");

    const basicOracleArtifact: Artifact = await hre.artifacts.readArtifact("BasicOracle");
    const oracle = <BasicOracle>await deployContract(signer, basicOracleArtifact, [signer.address]);
    const fixedPointOraclePrice = toFixedPoint(oraclePrice);
    await oracle.setValue(fixedPointOraclePrice);

    const WETH10 = <MockWETH10>await deployContract(signer as ethers.Signer, WETH10Artifact);

    const FlashLiquidatorArtifact: Artifact = await hre.artifacts.readArtifact("ExampleFlashLiquidator");

    const FlashLiquidator = <ExampleFlashLiquidator>(
        await deployContract(signer as ethers.Signer, FlashLiquidatorArtifact, [WETH10.address, Kresko.address])
    );

    const fixedPointFactor = toFixedPoint(factor);

    await Kresko.addCollateralAsset(WETH10.address, fixedPointFactor, oracle.address, false);

    return {
        WETH10,
        oracle,
        factor: fixedPointFactor,
        FlashLiquidator,
    };
}

describe("Kresko", function () {
    before(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];
        this.userThree = signers[3];
        this.liquidator = signers[4];

        // We intentionally allow constructor that calls the initializer
        // modifier and explicitly allow this in calls to `deployProxy`.
        // The upgrades library will still print warnings, so to avoid clutter
        // we just silence those here.
        console.log("Intentionally silencing Upgrades warnings");
        hre.upgrades.silenceWarnings();
    });

    beforeEach(async function () {
        const kreskoFactory = await hre.ethers.getContractFactory("Kresko");
        this.kresko = <Kresko>await (
            await hre.upgrades.deployProxy(
                kreskoFactory,
                [BURN_FEE, FEE_RECIPIENT_ADDRESS, LIQUIDATION_INCENTIVE, MINIMUM_COLLATERALIZATION_RATIO],
                {
                    unsafeAllow: [
                        "constructor", // Intentionally preventing others from initializing.
                        "delegatecall", // BoringBatchable -- only delegatecalls itself.
                    ],
                },
            )
        ).deployed();
    });

    describe("#initialize", function () {
        it("should initialize the contract with the correct parameters", async function () {
            expect(await this.kresko.burnFee()).to.equal(BURN_FEE);
            expect(await this.kresko.feeRecipient()).to.equal(FEE_RECIPIENT_ADDRESS);
            expect(await this.kresko.liquidationIncentiveMultiplier()).to.equal(LIQUIDATION_INCENTIVE);
            expect(await this.kresko.minimumCollateralizationRatio()).to.equal(MINIMUM_COLLATERALIZATION_RATIO);
        });

        it("should not allow being called more than once", async function () {
            await expect(
                this.kresko.initialize(
                    BURN_FEE,
                    FEE_RECIPIENT_ADDRESS,
                    LIQUIDATION_INCENTIVE,
                    MINIMUM_COLLATERALIZATION_RATIO,
                ),
            ).to.be.revertedWith("Initializable: contract is already initialized");
        });
    });

    describe("#ownership", function () {
        it("should have the admin as owner", async function () {
            expect(await this.kresko.owner()).to.equal(this.signers.admin.address);
            expect(await this.kresko.pendingOwner()).to.equal(ADDRESS_ZERO);
        });

        it("should allow ownership transfer through claim and be able to call onlyOwner function", async function () {
            await this.kresko.transferOwnership(this.userOne.address);
            const pendingOwner = await this.kresko.pendingOwner();

            expect(pendingOwner).to.equal(this.userOne.address);
            await this.kresko.connect(this.userOne).claimOwnership();

            const newOwner = await this.kresko.owner();
            expect(newOwner).to.equal(this.userOne.address);

            const MAX_BURN_FEE = await this.kresko.MAX_BURN_FEE();
            await expect(this.kresko.connect(this.userOne).updateBurnFee(MAX_BURN_FEE)).to.be.not.reverted;

            const newBurnFee = await this.kresko.burnFee();
            expect(newBurnFee).to.equal(MAX_BURN_FEE);
        });

        it("should set pending owner to address zero after pending ownership is claimed", async function () {
            await this.kresko.transferOwnership(this.userOne.address);
            const pendingOwner = await this.kresko.pendingOwner();
            expect(pendingOwner).to.equal(this.userOne.address);
            await this.kresko.connect(this.userOne).claimOwnership();

            const pendingOwnerAfterClaim = await this.kresko.pendingOwner();
            expect(pendingOwnerAfterClaim).to.equal(ADDRESS_ZERO);
        });

        it("should not allow an address other than the pending owner to claim pending ownership", async function () {
            await this.kresko.transferOwnership(this.userOne.address);
            const pendingOwner = await this.kresko.pendingOwner();
            expect(pendingOwner).to.equal(this.userOne.address);
            await expect(this.kresko.connect(this.userTwo).claimOwnership()).to.be.revertedWith(
                "Ownable: caller != pending owner",
            );
        });

        it("should not allow old owner to call onlyOwner functions", async function () {
            await this.kresko.transferOwnership(this.userOne.address);
            const pendingOwner = await this.kresko.pendingOwner();
            expect(pendingOwner).to.equal(this.userOne.address);
            await this.kresko.connect(this.userOne).claimOwnership();

            const MAX_BURN_FEE = await this.kresko.MAX_BURN_FEE();
            await expect(this.kresko.connect(this.signers.admin).updateBurnFee(MAX_BURN_FEE)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });

        it("should not allow ownership transfer to zero address", async function () {
            await expect(this.kresko.transferOwnership(ADDRESS_ZERO)).to.be.revertedWith(
                "Ownable: new owner is the zero address",
            );
        });
    });

    describe("Collateral Assets", function () {
        beforeEach(async function () {
            this.collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);
        });

        describe("#addCollateralAsset", function () {
            it("should allow owner to add assets", async function () {
                const collateralAssetInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);

                const asset = await this.kresko.collateralAssets(collateralAssetInfo.collateralAsset.address);
                expect(asset.factor.rawValue).to.equal(collateralAssetInfo.factor);
                expect(asset.oracle).to.equal(collateralAssetInfo.oracle.address);
                expect(asset.exists).to.be.true;
            });

            it("should not allow collateral assets to be added more than once", async function () {
                await expect(
                    this.kresko.addCollateralAsset(
                        this.collateralAssetInfo.collateralAsset.address,
                        ONE,
                        ADDRESS_ONE,
                        false,
                    ),
                ).to.be.revertedWith("KR: collateralExists");
            });

            it("should not allow collateral assets with invalid asset address", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_ZERO, ONE, ADDRESS_ONE, false)).to.be.revertedWith(
                    "KR: !collateralAddr",
                );
            });

            it("should not allow collateral assets with collateral factor", async function () {
                await expect(
                    this.kresko.addCollateralAsset(ADDRESS_TWO, ONE.add(1), ADDRESS_ONE, false),
                ).to.be.revertedWith("KR: factor > 1FP");
            });

            it("should not allow collateral assets with invalid oracle address", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_TWO, ONE, ADDRESS_ZERO, false)).to.be.revertedWith(
                    "KR: !oracleAddr",
                );
            });

            it("should not allow non-owner to add assets", async function () {
                await expect(
                    this.kresko.connect(this.userOne).addCollateralAsset(ADDRESS_TWO, 1, ADDRESS_TWO, false),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateCollateralFactor", function () {
            it("should allow owner to update factor", async function () {
                const collateralAssetAddress = this.collateralAssetInfo.collateralAsset.address;
                await this.kresko.updateCollateralFactor(collateralAssetAddress, ZERO_POINT_FIVE);

                const asset = await this.kresko.collateralAssets(collateralAssetAddress);
                expect(asset.factor.rawValue).to.equal(ZERO_POINT_FIVE);
            });

            it("should emit CollateralAssetFactorUpdated event", async function () {
                const collateralAssetAddress = this.collateralAssetInfo.collateralAsset.address;
                const receipt = await this.kresko.updateCollateralFactor(collateralAssetAddress, ZERO_POINT_FIVE);

                const event = (await extractEventFromTxReceipt(receipt, "CollateralAssetFactorUpdated"))![0].args!;
                expect(event.collateralAsset).to.equal(collateralAssetAddress);
                expect(event.factor).to.equal(ZERO_POINT_FIVE);
            });

            it("should not allow the collateral factor to be greater than 1", async function () {
                await expect(
                    this.kresko.updateCollateralFactor(this.collateralAssetInfo.collateralAsset.address, ONE.add(1)),
                ).to.be.revertedWith("KR: factor > 1FP");
            });

            it("should not allow non-owner to update collateral factor", async function () {
                await expect(
                    this.kresko.connect(this.userOne).updateCollateralFactor(ADDRESS_ONE, ZERO_POINT_FIVE),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateCollateralAssetOracle", function () {
            it("should allow owner to update oracle address", async function () {
                const collateralAssetAddress = this.collateralAssetInfo.collateralAsset.address;
                await this.kresko.updateCollateralAssetOracle(collateralAssetAddress, ADDRESS_TWO);

                const asset = await this.kresko.collateralAssets(collateralAssetAddress);
                expect(asset.oracle).to.equal(ADDRESS_TWO);
            });

            it("should emit CollateralAssetOracleUpdated event", async function () {
                const collateralAssetAddress = this.collateralAssetInfo.collateralAsset.address;
                const receipt = await this.kresko.updateCollateralAssetOracle(collateralAssetAddress, ADDRESS_TWO);

                const event = (await extractEventFromTxReceipt(receipt, "CollateralAssetOracleUpdated"))![0].args!;
                expect(event.collateralAsset).to.equal(collateralAssetAddress);
                expect(event.oracle).to.equal(ADDRESS_TWO);
            });

            it("should not allow the oracle address to be the zero address", async function () {
                await expect(
                    this.kresko.updateCollateralAssetOracle(
                        this.collateralAssetInfo.collateralAsset.address,
                        ADDRESS_ZERO,
                    ),
                ).to.be.revertedWith("KR: !oracleAddr");
            });

            it("should not allow non-owner to update collateral asset oracle", async function () {
                await expect(
                    this.kresko.connect(this.userOne).updateCollateralAssetOracle(ADDRESS_ONE, ADDRESS_TWO),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });
    describe("Account collateral", function () {
        beforeEach(async function () {
            this.initialUserCollateralBalance = 1000;

            this.collateralAssetInfos = (await Promise.all<CollateralAssetInfo>([
                deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18),
                deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 12),
                deployAndWhitelistCollateralAsset(this.kresko, 0.6, 20.123, 24),
            ])) as CollateralAssetInfo[];

            // Give userOne a balance of 1000 for each collateral asset.
            for (const collateralAssetInfo of this.collateralAssetInfos as CollateralAssetInfo[]) {
                await collateralAssetInfo.collateralAsset.setBalanceOf(
                    this.userOne.address,
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
                            deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18, true),
                            deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 18, true),
                            deployAndWhitelistCollateralAsset(this.kresko, 0.6, 20.123, 18, true),
                        ]);

                        // Give userOne a balance of 1000 for each rebasing (ie underlying) token.
                        for (const collateralAssetInfo of this.collateralAssetInfos) {
                            await collateralAssetInfo.rebasingToken!.setBalanceOf(
                                this.userOne.address,
                                collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                            );
                            // also set approval for Kresko.sol -- virtually infinite for ease of testing
                            await collateralAssetInfo
                                .rebasingToken!.connect(this.userOne)
                                .approve(this.kresko.address, ethers.BigNumber.from(2).pow(256).sub(1));
                        }

                        this.depositFunction = this.kresko.connect(this.userOne).depositRebasingCollateral;
                    } else {
                        this.depositFunction = this.kresko.connect(this.userOne).depositCollateral;
                    }
                });

                describe(`#deposit${rebasing ? "Rebasing" : ""}Collateral`, function () {
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
                        await this.depositFunction(collateralAsset.address, depositAmount);

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
                        let userOneBalance: BigNumber;
                        if (rebasing) {
                            userOneBalance = await collateralAssetInfo.rebasingToken.balanceOf(this.userOne.address);
                        } else {
                            userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                        }
                        expect(userOneBalance).to.equal(
                            collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance).sub(depositAmount),
                        );
                    });

                    it("should allow an account to deposit more collateral to an existing deposit", async function () {
                        const collateralAssetInfo = this.collateralAssetInfos[0];
                        const collateralAsset = collateralAssetInfo.collateralAsset;

                        // Deposit an initial amount
                        const depositAmount0 = collateralAssetInfo.fromDecimal(123.321);
                        await this.depositFunction(collateralAsset.address, depositAmount0);

                        // Deposit a secound amount
                        const depositAmount1 = collateralAssetInfo.fromDecimal(321.123);
                        await this.depositFunction(collateralAsset.address, depositAmount1);

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
                        await this.depositFunction(collateralAsset0.address, depositAmount0);

                        // Deposit a different collateral asset.
                        const depositAmount1 = collateralAssetInfo1.fromDecimal(321.123);
                        await this.depositFunction(collateralAsset1.address, depositAmount1);

                        // Confirm the array of the user's deposited collateral assets hasn't been double-pushed to.
                        const depositedCollateralAssetsAfter = await this.kresko.getDepositedCollateralAssets(
                            this.userOne.address,
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
                        const receipt = await this.depositFunction(collateralAsset.address, depositAmount);

                        const event = (await extractEventFromTxReceipt(receipt, "CollateralDeposited"))![0].args!;
                        expect(event.account).to.equal(this.userOne.address);
                        expect(event.collateralAsset).to.equal(collateralAsset.address);
                        expect(event.amount).to.equal(depositAmount);
                    });

                    it("should revert if depositing collateral that has not been whitelisted", async function () {
                        await expect(this.depositFunction(ADDRESS_ONE, parseEther("123"))).to.be.revertedWith(
                            "KR: !collateralExists",
                        );
                    });

                    it("should revert if depositing an amount of 0", async function () {
                        const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                        await expect(this.depositFunction(collateralAsset.address, 0)).to.be.revertedWith(
                            `KR: 0-deposit`,
                        );
                    });

                    if (rebasing) {
                        it("should revert if depositing collateral that is not a NonRebasingWrapperToken", async function () {
                            const nonNRWTInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);
                            await expect(
                                this.depositFunction(nonNRWTInfo.collateralAsset.address, 1),
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
                                await this.kresko
                                    .connect(this.userOne)
                                    .depositRebasingCollateral(
                                        collateralAssetInfo.collateralAsset.address,
                                        collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                                    );
                            }
                            this.withdrawalFunction = this.kresko.connect(this.userOne).withdrawRebasingCollateral;
                        } else {
                            for (const collateralAssetInfo of this.collateralAssetInfos) {
                                await this.kresko
                                    .connect(this.userOne)
                                    .depositCollateral(
                                        collateralAssetInfo.collateralAsset.address,
                                        collateralAssetInfo.fromDecimal(this.initialDepositAmount),
                                    );
                            }
                            this.withdrawalFunction = this.kresko.connect(this.userOne).withdrawCollateral;
                        }
                    });

                    describe("when the account's minimum collateral value is 0", function () {
                        it("should allow an account to withdraw their entire deposit", async function () {
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            await this.withdrawalFunction(
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
                            if (rebasing) {
                                const userOneNRWTBalance = await collateralAsset.balanceOf(this.userOne.address);
                                expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                                const userOneRebasingBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                    this.userOne.address,
                                );
                                expect(userOneRebasingBalance).to.equal(
                                    collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
                                );
                            } else {
                                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
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

                            if (rebasing) {
                                const userOneNRWTBalance = await collateralAsset.balanceOf(this.userOne.address);
                                expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                                const userOneRebasingBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                    this.userOne.address,
                                );
                                expect(userOneRebasingBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            } else {
                                const kreskoBalance = await collateralAsset.balanceOf(this.kresko.address);
                                expect(kreskoBalance).to.equal(initialDepositAmount.sub(amountToWithdraw));
                                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                                expect(userOneBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            }
                        });

                        it("should emit CollateralWithdrawn event", async function () {
                            const amountToWithdraw = parseEther("49.43");
                            const collateralAssetInfo = this.collateralAssetInfos[0];
                            const collateralAsset = collateralAssetInfo.collateralAsset;

                            const receipt = await this.withdrawalFunction(
                                collateralAsset.address,
                                amountToWithdraw,
                                0, // The index of collateralAsset.address in the account's depositedCollateralAssets
                            );

                            const event = (await extractEventFromTxReceipt(receipt, "CollateralWithdrawn"))![0].args!;
                            expect(event.account).to.equal(this.userOne.address);
                            expect(event.collateralAsset).to.equal(collateralAsset.address);
                            expect(event.amount).to.equal(amountToWithdraw);
                        });
                    });

                    describe("when the account's minimum collateral value is > 0", function () {
                        beforeEach(async function () {
                            // Deploy Kresko assets, adding them to the whitelist
                            const kreskoAssetInfo = await addNewKreskoAssetWithOraclePrice(
                                this.kresko,
                                NAME_TWO,
                                SYMBOL_TWO,
                                1,
                                250,
                            ); // kFactor = 1, price = $250

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
                            const accountCollateralValue = await this.kresko.getAccountCollateralValue(
                                this.userOne.address,
                            );
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

                            await this.withdrawalFunction(collateralAsset.address, amountToWithdraw, 0);
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

                            if (rebasing) {
                                const userOneNRWTBalance = await collateralAsset.balanceOf(this.userOne.address);
                                expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                                const userOneRebasingBalance = await collateralAssetInfo.rebasingToken.balanceOf(
                                    this.userOne.address,
                                );
                                expect(userOneRebasingBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            } else {
                                const userOneBalance = await collateralAsset.balanceOf(this.userOne.address);
                                expect(userOneBalance).to.equal(
                                    collateralAssetInfo
                                        .fromDecimal(this.initialUserCollateralBalance)
                                        .sub(initialDepositAmount)
                                        .add(amountToWithdraw),
                                );
                            }

                            // Ensure the account's minimum collateral value is <= the account collateral value
                            // These are FixedPoint.Unsigned, be sure to use `rawValue` when appropriate!
                            const accountMinCollateralValueAfter = await this.kresko.getAccountMinimumCollateralValue(
                                this.userOne.address,
                            );
                            const accountCollateralValueAfter = await this.kresko.getAccountCollateralValue(
                                this.userOne.address,
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
                            const accountMinCollateralValue = await this.kresko.getAccountMinimumCollateralValue(
                                this.userOne.address,
                            );
                            const accountCollateralValue = await this.kresko.getAccountCollateralValue(
                                this.userOne.address,
                            );
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
                                this.withdrawalFunction(
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
                            await collateralAssetInfo.collateralAsset.balanceOf(this.kresko.address),
                        );

                        expect(kreskoCollateralBalanceBeforeWithdraw).to.equal(this.initialDepositAmount);

                        if (rebasing) {
                            const userOneNRWTBalance = await collateralAsset.balanceOf(this.userOne.address);
                            expect(userOneNRWTBalance).to.equal(BigNumber.from(0));

                            const rebasingTokenDecimals = Number(await collateralAsset.decimals());

                            const userOneRebasingBalanceBeforeWithdraw = fromBig(
                                await collateralAssetInfo.rebasingToken!.balanceOf(this.userOne.address),
                                rebasingTokenDecimals,
                            );

                            expect(userOneRebasingBalanceBeforeWithdraw).to.equal(balanceAfterDeposit);

                            await this.withdrawalFunction(collateralAsset.address, overflowWithdrawAmount, 0);

                            const userOneRebasingBalanceAfterOverflowWithdraw = fromBig(
                                await collateralAssetInfo.rebasingToken!.balanceOf(this.userOne.address),
                                rebasingTokenDecimals,
                            );

                            expect(userOneRebasingBalanceAfterOverflowWithdraw).to.equal(
                                this.initialUserCollateralBalance,
                            );

                            const kreskoNRWTbalanceAfterOverflowWithdraw = fromBig(
                                await collateralAssetInfo.collateralAsset.balanceOf(this.kresko.address),
                                collateralAssetDecimals,
                            );
                            expect(kreskoNRWTbalanceAfterOverflowWithdraw).to.equal(0);
                        } else {
                            const accountBalanceBeforeOverflowWithdrawal = fromBig(
                                await collateralAsset.balanceOf(this.userOne.address),
                                collateralAssetDecimals,
                            );

                            expect(accountBalanceBeforeOverflowWithdrawal).to.equal(balanceAfterDeposit);

                            await this.withdrawalFunction(collateralAsset.address, overflowWithdrawAmount, 0);

                            const userOneBalanceAfterOverflowWithdraw = fromBig(
                                await collateralAsset.balanceOf(this.userOne.address),
                                collateralAssetDecimals,
                            );

                            expect(userOneBalanceAfterOverflowWithdraw).to.equal(this.initialUserCollateralBalance);

                            const kreskoCollateralBalanceAfterOverflowWithdraw = fromBig(
                                await collateralAsset.balanceOf(this.kresko.address),
                                collateralAssetDecimals,
                            );

                            expect(kreskoCollateralBalanceAfterOverflowWithdraw).to.equal(0);
                        }
                    });

                    it("should revert if withdrawing an amount of 0", async function () {
                        const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                        await expect(this.withdrawalFunction(collateralAsset.address, 0, 0)).to.be.revertedWith(
                            "KR: 0-withdraw",
                        );
                    });

                    if (rebasing) {
                        it("should revert if depositing collateral that is not a NonRebasingWrapperToken", async function () {
                            const nonNRWTInfo = await deployAndWhitelistCollateralAsset(this.kresko, 0.8, 123.45, 18);
                            // Give 1000 to userOne
                            await nonNRWTInfo.collateralAsset.setBalanceOf(
                                this.userOne.address,
                                nonNRWTInfo.fromDecimal(this.initialUserCollateralBalance),
                            );
                            // Have userOne deposit 100 of the collateral asset.
                            await this.kresko
                                .connect(this.userOne)
                                .depositCollateral(
                                    nonNRWTInfo.collateralAsset.address,
                                    nonNRWTInfo.fromDecimal(this.initialDepositAmount),
                                );
                            await expect(
                                this.withdrawalFunction(nonNRWTInfo.collateralAsset.address, 1, 0),
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
        async function deployAndAddKreskoAsset(
            this: any,
            name: string,
            symbol: string,
            kFactor: BigNumber,
            oracleAddress: string,
        ) {
            const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
            const kreskoAsset = <KreskoAsset>await (
                await hre.upgrades.deployProxy(
                    kreskoAssetFactory,
                    [name, symbol, this.signers.admin.address, this.kresko.address],
                    {
                        unsafeAllow: ["constructor"],
                    },
                )
            ).deployed();
            await this.kresko.addKreskoAsset(kreskoAsset.address, symbol, kFactor, oracleAddress);
            return kreskoAsset;
        }

        beforeEach(async function () {
            this.deployAndAddKreskoAsset = deployAndAddKreskoAsset.bind(this);

            const kreskoAssetInfo = await addNewKreskoAssetWithOraclePrice(this.kresko, NAME_ONE, SYMBOL_ONE, 1, 1);
            this.deployedAssetAddress = kreskoAssetInfo.kreskoAsset.address;
        });

        describe("#addKreskoAsset", function () {
            it("should allow owner to add new kresko assets and emit event KreskoAssetAdded", async function () {
                const deployedKreskoAsset = await this.deployAndAddKreskoAsset(NAME_TWO, SYMBOL_TWO, ONE, ADDRESS_TWO);
                const kreskoAssetInfo = await this.kresko.kreskoAssets(deployedKreskoAsset.address);
                expect(kreskoAssetInfo.kFactor.rawValue).to.equal(ONE.toString());
                expect(kreskoAssetInfo.oracle).to.equal(ADDRESS_TWO);
            });

            it("should not allow adding kresko asset that does not have Kresko as operator", async function () {
                const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
                const kreskoAsset = <KreskoAsset>await (
                    await hre.upgrades.deployProxy(
                        kreskoAssetFactory,
                        ["TEST", "TEST2", this.signers.admin.address, this.userTwo.address],
                        {
                            unsafeAllow: ["constructor"],
                        },
                    )
                ).deployed();

                await expect(
                    this.kresko.addKreskoAsset(kreskoAsset.address, "TEST2", ONE, ADDRESS_TWO),
                ).to.be.revertedWith("KR: !assetOperator");
            });

            it("should not allow kresko assets that have the same symbol as an existing kresko asset", async function () {
                await expect(this.kresko.addKreskoAsset(ADDRESS_ONE, SYMBOL_ONE, ONE, ADDRESS_TWO)).to.be.revertedWith(
                    "KR: symbolExists",
                );
            });

            it("should not allow kresko assets with invalid asset symbol", async function () {
                await expect(this.kresko.addKreskoAsset(ADDRESS_ONE, "", ONE, ADDRESS_TWO)).to.be.revertedWith(
                    "KR: !string",
                );
            });

            it("should not allow kresko assets with an invalid k factor", async function () {
                await expect(
                    this.kresko.addKreskoAsset(ADDRESS_ONE, SYMBOL_TWO, ONE.sub(1), ADDRESS_TWO),
                ).to.be.revertedWith("KR: kFactor < 1FP");
            });

            it("should not allow kresko assets with an invalid oracle address", async function () {
                await expect(this.kresko.addKreskoAsset(ADDRESS_ONE, SYMBOL_TWO, ONE, ADDRESS_ZERO)).to.be.revertedWith(
                    "KR: !oracleAddr",
                );
            });

            it("should not allow non-owner to add assets", async function () {
                await expect(
                    this.kresko.connect(this.userOne).addKreskoAsset(ADDRESS_ONE, SYMBOL_TWO, ONE, ADDRESS_TWO),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateKreskoAssetFactor", function () {
            it("should allow owner to update factor", async function () {
                await this.kresko.connect(this.signers.admin).updateKreskoAssetFactor(this.deployedAssetAddress, ONE);

                const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
                expect(asset.kFactor.rawValue).to.equal(ONE.toString());
            });

            it("should emit KreskoAssetKFactorUpdated event", async function () {
                const receipt = await this.kresko
                    .connect(this.signers.admin)
                    .updateKreskoAssetFactor(this.deployedAssetAddress, ONE);

                const event = (await extractEventFromTxReceipt(receipt, "KreskoAssetKFactorUpdated"))![0].args!;
                expect(event.kreskoAsset).to.equal(this.deployedAssetAddress);
                expect(event.kFactor).to.equal(ONE);
            });

            it("should not allow a kresko asset's k-factor to be less than 1", async function () {
                await expect(
                    this.kresko.updateKreskoAssetFactor(this.deployedAssetAddress, ONE.sub(1)),
                ).to.be.revertedWith("KR: kFactor < 1FP");
            });

            it("should not allow non-owner to update kresko asset's k-factor", async function () {
                await expect(
                    this.kresko
                        .connect(this.userOne)
                        .updateKreskoAssetFactor(this.deployedAssetAddress, ZERO_POINT_FIVE),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateKreskoAssetMintable", function () {
            it("should allow owner to update the mintable property", async function () {
                // Expect mintable to be true first
                expect((await this.kresko.kreskoAssets(this.deployedAssetAddress)).mintable).to.equal(true);
                // Set it to false
                await this.kresko
                    .connect(this.signers.admin)
                    .updateKreskoAssetMintable(this.deployedAssetAddress, false);
                // Expect mintable to be false now
                expect((await this.kresko.kreskoAssets(this.deployedAssetAddress)).mintable).to.equal(false);
                // Set it to true
                await this.kresko
                    .connect(this.signers.admin)
                    .updateKreskoAssetMintable(this.deployedAssetAddress, true);
                // Expect mintable to be true now
                expect((await this.kresko.kreskoAssets(this.deployedAssetAddress)).mintable).to.equal(true);
            });

            it("should emit KreskoAssetMintableUpdated event", async function () {
                const receipt = await this.kresko
                    .connect(this.signers.admin)
                    .updateKreskoAssetMintable(this.deployedAssetAddress, false);
                const event = (await extractEventFromTxReceipt(receipt, "KreskoAssetMintableUpdated"))![0].args!;
                expect(event.kreskoAsset).to.equal(this.deployedAssetAddress);
                expect(event.mintable).to.equal(false);
            });

            it("should not allow non-owner to update the mintable property", async function () {
                await expect(
                    this.kresko.connect(this.userOne).updateKreskoAssetMintable(this.deployedAssetAddress, false),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateKreskoAssetOracle", function () {
            it("should allow owner to update oracle address", async function () {
                await this.kresko
                    .connect(this.signers.admin)
                    .updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_TWO);

                const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
                expect(asset.oracle).to.equal(ADDRESS_TWO);
            });

            it("should emit KreskoAssetOracleUpdated event", async function () {
                const receipt = await this.kresko
                    .connect(this.signers.admin)
                    .updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_TWO);

                const event = (await extractEventFromTxReceipt(receipt, "KreskoAssetOracleUpdated"))![0].args!;
                expect(event.kreskoAsset).to.equal(this.deployedAssetAddress);
                expect(event.oracle).to.equal(ADDRESS_TWO);
            });

            it("should not allow a kresko asset's oracle address to be the zero address", async function () {
                await expect(
                    this.kresko.updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_ZERO),
                ).to.be.revertedWith("KR: !oracleAddr");
            });

            it("should not allow non-owner to update kresko asset's oracle", async function () {
                await expect(
                    this.kresko.connect(this.userOne).updateKreskoAssetOracle(this.deployedAssetAddress, ADDRESS_TWO),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Kresko asset minting and burning", function () {
        beforeEach(async function () {
            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetInfos = await Promise.all([
                addNewKreskoAssetWithOraclePrice(this.kresko, NAME_ONE, SYMBOL_ONE, 1, 5), // kFactor = 1, price = $5.00
                addNewKreskoAssetWithOraclePrice(this.kresko, NAME_TWO, SYMBOL_TWO, 1.1, 500), // kFactor = 1.1, price = $500
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

        describe("#mintKreskoAsset", function () {
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

            it("should emit KreskoAssetMinted event", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const mintAmount = 500;
                const receipt = await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAssetAddress, mintAmount);

                const event = (await extractEventFromTxReceipt(receipt, "KreskoAssetMinted"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.kreskoAsset).to.equal(kreskoAssetAddress);
                expect(event.amount).to.equal(mintAmount);
            });

            it("should not allow users to mint non-whitelisted Kresko assets", async function () {
                // Attempt to mint a non-deployed, non-whitelisted Kresko asset
                await expect(this.kresko.connect(this.userOne).mintKreskoAsset(ADDRESS_TWO, 5)).to.be.revertedWith(
                    "KR: !krAssetExist",
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
                ).to.be.revertedWith("KR: insufficientCollateral");
            });
        });

        describe("#burnKreskoAsset", function () {
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

            it("should allow users to burn some of their Kresko asset balances", async function () {
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

            it("should allow users to burn their full balance of a Kresko asset", async function () {
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

            it("should emit KreskoAssetBurned event", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;
                const receipt = await this.kresko
                    .connect(this.userOne)
                    .burnKreskoAsset(kreskoAssetAddress, this.mintAmount, kreskoAssetIndex);

                const event = (await extractEventFromTxReceipt(receipt, "KreskoAssetBurned"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.kreskoAsset).to.equal(kreskoAssetAddress);
                expect(event.amount).to.equal(this.mintAmount);
            });

            it("should not allow users to burn an amount of 0", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;

                await expect(
                    this.kresko.connect(this.userOne).burnKreskoAsset(kreskoAssetAddress, 0, kreskoAssetIndex),
                ).to.be.revertedWith("KR: 0-burn");
            });

            it("should not allow users to burn more kresko assets than they hold as debt", async function () {
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;
                const kreskoAssetIndex = 0;
                const burnAmount = this.mintAmount.add(1);

                await expect(
                    this.kresko.connect(this.userOne).burnKreskoAsset(kreskoAssetAddress, burnAmount, kreskoAssetIndex),
                ).to.be.revertedWith("KR: amount > debt");
            });

            it("should allow users to burn Kresko assets without giving token approval to Kresko.sol contract", async function () {
                const secondMintAmount = 1;
                const burnAmount = this.mintAmount.add(secondMintAmount);
                const kreskoAssetAddress = this.kreskoAssetInfos[0].kreskoAsset.address;

                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAssetAddress, secondMintAmount);

                const kreskoAssetIndex = 0;

                const receipt = await this.kresko
                    .connect(this.userOne)
                    .burnKreskoAsset(kreskoAssetAddress, burnAmount, kreskoAssetIndex);

                const event = (await extractEventFromTxReceipt(receipt, "KreskoAssetBurned"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.kreskoAsset).to.equal(kreskoAssetAddress);
                expect(event.amount).to.equal(burnAmount);
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

                it("should charge the protocol burn fee with a single collateral asset if the deposit amount is sufficient and emit BurnFeePaid event", async function () {
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

    describe("Global variables", function () {
        describe("#updateMinimumCollateralizationRatio", function () {
            const validMinimumCollateralizationRatio = toFixedPoint(1.51); // 151%
            const invalidMinimumCollateralizationRatio = toFixedPoint(0.99); // 99%

            it("should allow the owner to set the minimum collateralization ratio", async function () {
                expect(await this.kresko.minimumCollateralizationRatio()).to.equal(MINIMUM_COLLATERALIZATION_RATIO);

                await this.kresko
                    .connect(this.signers.admin)
                    .updateMinimumCollateralizationRatio(validMinimumCollateralizationRatio);

                expect(await this.kresko.minimumCollateralizationRatio()).to.equal(validMinimumCollateralizationRatio);
            });

            it("should emit MinimumCollateralizationRatioUpdated event", async function () {
                const receipt = await this.kresko
                    .connect(this.signers.admin)
                    .updateMinimumCollateralizationRatio(validMinimumCollateralizationRatio);

                const event = (await extractEventFromTxReceipt(receipt, "MinimumCollateralizationRatioUpdated"))![0]
                    .args!;
                expect(event.minimumCollateralizationRatio).to.equal(validMinimumCollateralizationRatio);
            });

            it("should not allow the minimum collateralization ratio to be below MIN_MINIMUM_COLLATERALIZATION_RATIO", async function () {
                await expect(
                    this.kresko
                        .connect(this.signers.admin)
                        .updateMinimumCollateralizationRatio(invalidMinimumCollateralizationRatio),
                ).to.be.revertedWith("KR: minCollateralRatio < min");
            });

            it("should not allow minimum collateralization ratio to be set by non-owner", async function () {
                await expect(
                    this.kresko
                        .connect(this.userOne)
                        .updateMinimumCollateralizationRatio(validMinimumCollateralizationRatio),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateBurnFee", function () {
            const validNewBurnFee = toFixedPoint(0.042);
            it("should allow the owner to update the burn fee", async function () {
                // Ensure it has the expected initial value
                expect(await this.kresko.burnFee()).to.equal(BURN_FEE);

                await this.kresko.connect(this.signers.admin).updateBurnFee(validNewBurnFee);

                expect(await this.kresko.burnFee()).to.equal(validNewBurnFee);
            });

            it("should emit BurnFeeUpdated event", async function () {
                const receipt = await this.kresko.connect(this.signers.admin).updateBurnFee(validNewBurnFee);

                const event = (await extractEventFromTxReceipt(receipt, "BurnFeeUpdated"))![0].args!;
                expect(event.burnFee).to.equal(validNewBurnFee);
            });

            it("should not allow the burn fee to exceed MAX_BURN_FEE", async function () {
                const newBurnFee = (await this.kresko.MAX_BURN_FEE()).add(1);
                await expect(this.kresko.connect(this.signers.admin).updateBurnFee(newBurnFee)).to.be.revertedWith(
                    "KR: burnFee > max",
                );
            });

            it("should not allow the burn fee to be updated by non-owner", async function () {
                await expect(this.kresko.connect(this.userOne).updateBurnFee(validNewBurnFee)).to.be.revertedWith(
                    "Ownable: caller is not the owner",
                );
            });
        });

        describe("#updateFeeRecipient", function () {
            const validFeeRecipient = "0xF00D000000000000000000000000000000000000";
            it("should allow the owner to update the fee recipient", async function () {
                // Ensure it has the expected initial value
                expect(await this.kresko.feeRecipient()).to.equal(FEE_RECIPIENT_ADDRESS);

                await this.kresko.connect(this.signers.admin).updateFeeRecipient(validFeeRecipient);

                expect(await this.kresko.feeRecipient()).to.equal(validFeeRecipient);
            });

            it("should emit UpdateFeeRecipient event", async function () {
                const receipt = await this.kresko.connect(this.signers.admin).updateFeeRecipient(validFeeRecipient);

                const event = (await extractEventFromTxReceipt(receipt, "FeeRecipientUpdated"))![0].args!;
                expect(event.feeRecipient).to.equal(validFeeRecipient);
            });

            it("should not allow the fee recipient to be the zero address", async function () {
                await expect(
                    this.kresko.connect(this.signers.admin).updateFeeRecipient(ADDRESS_ZERO),
                ).to.be.revertedWith("KR: !feeRecipient");
            });

            it("should not allow the fee recipient to be updated by non-owner", async function () {
                await expect(
                    this.kresko.connect(this.userOne).updateFeeRecipient(validFeeRecipient),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("#updateLiquidationIncentive", function () {
            const validLiquidationIncentiveMultiplier = toFixedPoint(1.15);
            it("should allow the owner to update the liquidation incentive", async function () {
                // Ensure it has the expected initial value
                expect(await this.kresko.liquidationIncentiveMultiplier()).to.equal(LIQUIDATION_INCENTIVE);

                await this.kresko
                    .connect(this.signers.admin)
                    .updateLiquidationIncentiveMultiplier(validLiquidationIncentiveMultiplier);

                expect(await this.kresko.liquidationIncentiveMultiplier()).to.equal(
                    validLiquidationIncentiveMultiplier,
                );
            });

            it("should emit LiquidationIncentiveMultiplierUpdated event", async function () {
                const receipt = await this.kresko
                    .connect(this.signers.admin)
                    .updateLiquidationIncentiveMultiplier(validLiquidationIncentiveMultiplier);

                const event = (await extractEventFromTxReceipt(receipt, "LiquidationIncentiveMultiplierUpdated"))![0]
                    .args!;

                expect(event.liquidationIncentiveMultiplier).to.equal(validLiquidationIncentiveMultiplier);
            });

            it("should not allow the liquidation incentive to be less than the MIN_LIQUIDATION_INCENTIVE_MULTIPLIER", async function () {
                const newLiquidationIncentiveMultiplier = (
                    await this.kresko.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER()
                ).sub(1);
                await expect(
                    this.kresko
                        .connect(this.signers.admin)
                        .updateLiquidationIncentiveMultiplier(newLiquidationIncentiveMultiplier),
                ).to.be.revertedWith("KR: liqIncentiveMulti < min");
            });

            it("should not allow the liquidation incentive multiplier to exceed MAX_LIQUIDATION_INCENTIVE_MULTIPLIER", async function () {
                const newLiquidationIncentiveMultiplier = (
                    await this.kresko.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER()
                ).add(1);
                await expect(
                    this.kresko
                        .connect(this.signers.admin)
                        .updateLiquidationIncentiveMultiplier(newLiquidationIncentiveMultiplier),
                ).to.be.revertedWith("KR: liqIncentiveMulti > max");
            });

            it("should not allow the liquidation incentive multiplier to be updated by non-owner", async function () {
                await expect(
                    this.kresko
                        .connect(this.userOne)
                        .updateLiquidationIncentiveMultiplier(validLiquidationIncentiveMultiplier),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Liquidations", function () {
        beforeEach(async function () {
            // Deploy Kresko assets, adding them to the whitelist
            this.kreskoAssetInfo = await Promise.all([
                addNewKreskoAssetWithOraclePrice(this.kresko, NAME_ONE, SYMBOL_ONE, 1, 10), // kFactor = 1, price = $10.00
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

        describe("#isAccountLiquidatable", function () {
            it("should identify accounts below their minimum collateralization ratio", async function () {
                // Initial debt value: (1000 * $10) = $10,000
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const userDebtAmount = await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address);
                const userDebtAmountInUSD = await this.kresko.getKrAssetValue(kreskoAsset.address, userDebtAmount);
                expect(userDebtAmountInUSD.rawValue).to.equal(10000);

                // Initial collateral value: (1000 * $20) = $20,000
                const initialUserCollateralAmountInUSD = await this.kresko.getAccountCollateralValue(
                    this.userOne.address,
                );
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
        });

        describe("#liquidate", function () {
            it("should allow unhealthy accounts to be liquidated", async function () {
                // Change collateral asset's USD value from $20 to $11
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.setValue(fixedPointOraclePrice);

                const krAssetOracle = this.kr;

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
                        true,
                    );

                // Confirm that the liquidated user's debt amount has decreased by the repaid amount
                const afterUserOneDebtAmount = await this.kresko.kreskoAssetDebt(
                    this.userOne.address,
                    kreskoAsset.address,
                );
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

            it("should emit LiquidationOccurred event", async function () {
                // Change collateral asset's USD value from $20 to $11
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.setValue(fixedPointOraclePrice);

                // Fetch user's debt amount prior to liquidation
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const beforeUserOneDebtAmount = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address),
                );

                // Attempt liquidation
                const repayAmount = 100; // userTwo holds Kresko assets that can be used to repay userOne's loan
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        true,
                    );

                const event = (await extractEventFromTxReceipt(receipt, "LiquidationOccurred"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.liquidator).to.equal(this.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(collateralAsset.address);

                // Seized amount is calculated internally on contract, here we're just doing a sanity max check
                const maxPossibleSeizedAmount = beforeUserOneDebtAmount;
                expect(fromBig(event.collateralSent)).to.be.lessThanOrEqual(maxPossibleSeizedAmount);
            });

            it("should send liquidator collateral profit and reduce debt accordingly _keepKrAssetDebt = false", async function () {
                await this.kresko.updateBurnFee(toFixedPoint(0.1)); // 10% BURN FEE
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;

                const krAssetDebt = await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address);

                // remove all debt
                await kreskoAsset.connect(this.userTwo).approve(this.kresko.address, ethers.constants.MaxUint256);
                await this.kresko.connect(this.userTwo).burnKreskoAsset(kreskoAsset.address, Number(krAssetDebt), 0);

                const liquidatorKrAssetValueBefore = Number(
                    await this.kresko.getAccountKrAssetValue(this.userTwo.address),
                );

                expect(liquidatorKrAssetValueBefore).to.equal(0);

                const userAddresses = [this.userOne.address, this.userTwo.address];
                const initialUserCollateralBalance = parseEther("10000");
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
                const userOneDepositAmount = parseEther("1000"); // 1000 * $20 = $20,000 in collateral value
                await this.kresko
                    .connect(this.userOne)
                    .depositCollateral(collateralAsset.address, userOneDepositAmount);

                // userOne mints 100 of the Kresko asset

                const useOneMintAmount = parseEther("1000"); // 1000 * $10 = $10,000 in debt value
                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAsset.address, useOneMintAmount);

                // userTwo deposits 10,000 of the collateral asset
                const userTwoDepositAmount = parseEther("10000"); // 10,000 * $20 = $200,000 in collateral value
                await this.kresko
                    .connect(this.userTwo)
                    .depositCollateral(collateralAsset.address, userTwoDepositAmount);

                // userTwo mints 100 of the Kresko asset
                const userTwoMintAmount = parseEther("200"); // 200 * $10 = $2,000 in debt value
                await this.kresko.connect(this.userTwo).mintKreskoAsset(kreskoAsset.address, userTwoMintAmount);

                // Change collateral asset's USD value from $20 to $5
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 5;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.setValue(fixedPointOraclePrice);

                // Fetch user's debt amount prior to liquidation
                const userOneDebtAmountBeforeLiquidation = Number(
                    formatEther(await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address)),
                );

                // userTwo holds Kresko assets that can be used to repay userOne's underwater loan
                const repayAmount = parseEther("200");

                // Get liquidators krAssetDebt before liquidation
                const liquidatorKrAssetDebtBeforeLiquidation = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address),
                );

                // Check liquidators collateralTokens balance before liquidation
                const liquidatorBalanceInWalletBeforeLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.userTwo.address),
                );

                // Liquidator has 0 collateral tokens in wallet before liquidation
                expect(liquidatorBalanceInWalletBeforeLiquidation).to.equal(0);

                // Liquidator has collateral deposit in the protocol
                const liquidatorBalanceInProtocolBeforeLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                );

                expect(liquidatorBalanceInProtocolBeforeLiquidation).to.equal(fromBig(userTwoDepositAmount));

                // Get underwater users collateral deposits before liquidation
                const userOneCollateralDepositAmountBeforeLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                );

                const userOneKrAssetValueBeforeLiq = Number(
                    await this.kresko.getAccountKrAssetValue(this.userOne.address),
                );

                const liquidatorDebtBefore = Number(
                    formatEther(await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address)),
                );

                // Liquidation
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        false,
                    );

                const event = (await extractEventFromTxReceipt(receipt, "LiquidationOccurred"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.liquidator).to.equal(this.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(collateralAsset.address);
                expect(Number(event.collateralSent)).to.be.greaterThan(0);

                const liquidatorDebtAfter = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userTwo.address, event.repayKreskoAsset),
                );

                expect(liquidatorDebtAfter).to.be.lessThan(liquidatorDebtBefore);

                const userOneDebtAmountAfterLiquidation = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address),
                );

                const userOneKrAssetValueAfterLiq = Number(
                    await this.kresko.getAccountKrAssetValue(this.userOne.address),
                );

                const liquidatorKrAssetDebtAfterLiquidation = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address),
                );

                const userOneCollateralDepositAmountAfterLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                );

                const liquidatorCollateralBalanceInWalletAfterLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.userTwo.address),
                );

                const liquidatorBalanceInProtocolAfterLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
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

                const feeRecipientBalance = fromBig(await collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS));

                // Protocol should receive 10% (MAX_BURN_FEE) from the liquidation
                expect(feeRecipientBalance).to.equal(liquidatorProfit);

                // Shouldn't be able to liquidate a healthy position anymore
                await expect(
                    this.kresko
                        .connect(this.userTwo)
                        .liquidate(
                            this.userOne.address,
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
                await this.kresko.updateBurnFee(toFixedPoint(0.1)); // 10%

                const userAddresses = [this.userOne.address, this.userTwo.address];
                const initialUserCollateralBalance = parseEther("10000");
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
                const userOneDepositAmount = parseEther("1000"); // 1000 * $20 = $20,000 in collateral value
                await this.kresko
                    .connect(this.userOne)
                    .depositCollateral(collateralAsset.address, userOneDepositAmount);

                // userOne mints 100 of the Kresko asset
                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const useOneMintAmount = parseEther("1000"); // 1000 * $10 = $10,000 in debt value
                await this.kresko.connect(this.userOne).mintKreskoAsset(kreskoAsset.address, useOneMintAmount);

                // userTwo deposits 10,000 of the collateral asset
                const userTwoDepositAmount = parseEther("10000"); // 10,000 * $20 = $200,000 in collateral value
                await this.kresko
                    .connect(this.userTwo)
                    .depositCollateral(collateralAsset.address, userTwoDepositAmount);

                // userTwo mints 100 of the Kresko asset
                const userTwoMintAmount = parseEther("500"); // 500 * $10 = $5,000 in debt value
                await this.kresko.connect(this.userTwo).mintKreskoAsset(kreskoAsset.address, userTwoMintAmount);

                // Change collateral asset's USD value from $20 to $5
                const oracle = this.collateralAssetInfos[0].oracle;
                const updatedCollateralPrice = 5;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await oracle.setValue(fixedPointOraclePrice);

                // Fetch user's debt amount prior to liquidation
                const userOneDebtAmountBeforeLiquidation = Number(
                    formatEther(await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address)),
                );

                // userTwo holds Kresko assets that can be used to repay userOne's underwater loan
                const repayAmount = parseEther("200");

                // Get liquidators krAssetDebt before liquidation
                const liquidatorKrAssetDebtBeforeLiquidation = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address),
                );

                // Check liquidators collateralTokens balance before liquidation
                const liquidatorBalanceInWalletBeforeLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.userTwo.address),
                );

                // Liquidator has 0 collateral tokens in wallet before liquidation
                expect(liquidatorBalanceInWalletBeforeLiquidation).to.equal(0);

                // Liquidator has collateral deposit in the protocol
                const liquidatorBalanceInProtocolBeforeLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                );

                expect(liquidatorBalanceInProtocolBeforeLiquidation).to.equal(fromBig(userTwoDepositAmount));

                // Get underwater users collateral deposits before liquidation
                const userOneCollateralDepositAmountBeforeLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                );

                const userOneKrAssetValueBeforeLiq = Number(
                    await this.kresko.getAccountKrAssetValue(this.userOne.address),
                );

                const liquidatorDebtBefore = Number(
                    formatEther(await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address)),
                );

                // Liquidation
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        true,
                    );

                const event = (await extractEventFromTxReceipt(receipt, "LiquidationOccurred"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.liquidator).to.equal(this.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(collateralAsset.address);
                expect(Number(event.collateralSent)).to.be.greaterThan(0);

                const liquidatorDebtAfter = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userTwo.address, event.repayKreskoAsset),
                );

                expect(liquidatorDebtAfter).to.be.equal(liquidatorDebtBefore);

                const userOneDebtAmountAfterLiquidation = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userOne.address, kreskoAsset.address),
                );

                const userOneKrAssetValueAfterLiq = Number(
                    await this.kresko.getAccountKrAssetValue(this.userOne.address),
                );

                const liquidatorKrAssetDebtAfterLiquidation = fromBig(
                    await this.kresko.kreskoAssetDebt(this.userTwo.address, kreskoAsset.address),
                );

                const userOneCollateralDepositAmountAfterLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userOne.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
                );

                const liquidatorCollateralBalanceInWalletAfterLiquidation = fromBig(
                    await this.collateralAssetInfos[0].collateralAsset.balanceOf(this.userTwo.address),
                );

                const liquidatorBalanceInProtocolAfterLiquidation = fromBig(
                    await this.kresko.collateralDeposits(
                        this.userTwo.address,
                        this.collateralAssetInfos[0].collateralAsset.address,
                    ),
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

                const feeRecipientBalance = fromBig(await collateralAsset.balanceOf(FEE_RECIPIENT_ADDRESS));
                // Liquidator gets whole collateral - burnfee in his/hers wallet
                expect(liquidatorCollateralBalanceInWalletAfterLiquidation).to.be.equal(fromBig(event.collateralSent));

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
                await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                // Check that liquidator's token approval to Kresko.sol contract is 0
                expect(await kreskoAsset.allowance(this.userTwo.address, this.kresko.address)).to.equal(0);

                // Liquidation should succeed despite lack of token approval
                const repayAmount = 100;
                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        true,
                    );

                const event = (await extractEventFromTxReceipt(receipt, "LiquidationOccurred"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.liquidator).to.equal(this.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(collateralAsset.address);

                // Confirm that liquidator's token approval is still 0
                expect(await kreskoAsset.allowance(this.userTwo.address, this.kresko.address)).to.equal(0);
            });

            it("should not change liquidator's existing token approvals during a successful liquidation", async function () {
                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

                const kreskoAsset = this.kreskoAssetInfo[0].kreskoAsset;
                const collateralAsset = this.collateralAssetInfos[0].collateralAsset;

                // Liquidator increases contract's token approval
                const repayAmount = 100;
                await kreskoAsset.connect(this.userTwo).approve(this.kresko.address, repayAmount);
                expect(await kreskoAsset.allowance(this.userTwo.address, this.kresko.address)).to.equal(repayAmount);

                const mintedKreskoAssetIndex = 0;
                const depositedCollateralAssetIndex = 0;
                const receipt = await this.kresko
                    .connect(this.userTwo)
                    .liquidate(
                        this.userOne.address,
                        kreskoAsset.address,
                        repayAmount,
                        collateralAsset.address,
                        mintedKreskoAssetIndex,
                        depositedCollateralAssetIndex,
                        true,
                    );

                const event = (await extractEventFromTxReceipt(receipt, "LiquidationOccurred"))![0].args!;
                expect(event.account).to.equal(this.userOne.address);
                expect(event.liquidator).to.equal(this.userTwo.address);
                expect(event.repayKreskoAsset).to.equal(kreskoAsset.address);
                expect(event.repayAmount).to.equal(repayAmount);
                expect(event.seizedCollateralAsset).to.equal(collateralAsset.address);

                // Confirm that liquidator's token approval is unchanged
                expect(await kreskoAsset.allowance(this.userTwo.address, this.kresko.address)).to.equal(repayAmount);
            });

            it("should not allow the liquidations of healthy accounts", async function () {
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
                            false,
                        ),
                ).to.be.revertedWith("KR: !accountLiquidatable");
            });

            it("should not allow liquidations if repayment amount is 0", async function () {
                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

                // userTwo holds Kresko assets that can be used to repay userOne's loan
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
                            true,
                        ),
                ).to.be.revertedWith("KR: 0-repay");
            });

            it("should not allow liquidations if the repayment amount is over the max repay amount", async function () {
                // Change collateral asset's USD value from $20 to $11
                const updatedCollateralPrice = 11;
                const fixedPointOraclePrice = toFixedPoint(updatedCollateralPrice);
                await this.collateralAssetInfos[0].oracle.setValue(fixedPointOraclePrice);

                // userTwo holds Kresko assets that can be used to repay userOne's loan
                const repayAmount = 1000;
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
                            false,
                        ),
                ).to.be.revertedWith("KR: repay > max");
            });
        });
    });
});
