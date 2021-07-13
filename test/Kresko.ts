import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { Kresko } from "../typechain/Kresko";
import { Signers } from "../types";

const ADDRESS_ZERO = hre.ethers.constants.AddressZero;
const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
const SYMBOL_ONE = "ONE";
const SYMBOL_TWO = "TWO";
const NAME_ONE = "One Kresko Asset";
const NAME_TWO = "Two Kresko Asset";

const { parseEther } = hre.ethers.utils;
const { deployContract } = hre.waffle;

const ONE = parseEther("1");
const ZERO_POINT_FIVE = parseEther("0.5");

describe("Kresko", function () {
    beforeEach(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];
    });

    describe("Collateral Assets", function () {
        beforeEach(async function () {
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>await deployContract(this.signers.admin, kreskoArtifact);

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
            expect(asset.factor).to.equal(ONE);
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should allow owner to update factor", async function () {
            await this.kresko.updateCollateralFactor(ADDRESS_ONE, ZERO_POINT_FIVE);

            const asset = await this.kresko.collateralAssets(ADDRESS_ONE);
            expect(asset.factor).to.equal(ZERO_POINT_FIVE);
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

    describe("Kresko Assets", function () {
        beforeEach(async function () {
            const kreskoArtifact: Artifact = await hre.artifacts.readArtifact("Kresko");
            this.kresko = <Kresko>await deployContract(this.signers.admin, kreskoArtifact);

            const tx: any = await this.kresko.addKreskoAsset(NAME_ONE, SYMBOL_ONE, ONE, ADDRESS_ONE);
            let receipt: any = await tx.wait();
            const addKreskoAssetEvent: any = receipt.events?.filter((x: any) => {return x.event == "AddKreskoAsset"});
            this.deployedAssetAddress = addKreskoAssetEvent[0].args.assetAddress;
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
            let receipt: any = await tx.wait();
            const addKreskoAssetEvent: any = receipt.events?.filter((x: any) => {return x.event == "AddKreskoAsset"});

            const asset = await this.kresko.kreskoAssets(addKreskoAssetEvent[0].args.assetAddress);
            expect(asset.kFactor).to.equal(ONE);
            expect(asset.oracle).to.equal(ADDRESS_TWO);
        });

        it("should allow owner to update factor", async function () {
            await this.kresko.updateKreskoAssetFactor(this.deployedAssetAddress, ZERO_POINT_FIVE);

            const asset = await this.kresko.kreskoAssets(this.deployedAssetAddress);
            expect(asset.kFactor).to.equal(ZERO_POINT_FIVE);
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
});
