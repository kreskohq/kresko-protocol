import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { Kresko } from "../typechain/Kresko";
import { Signers } from "../types";

const ADDRESS_ZERO = hre.ethers.constants.AddressZero;
const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";

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
            it("invalid asset factor", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_TWO, ONE, ADDRESS_ZERO)).to.be.revertedWith(
                    "ZERO_ADDRESS",
                );
            });
            it("invalid oracle address", async function () {
                await expect(this.kresko.addCollateralAsset(ADDRESS_TWO, 0, ADDRESS_ONE)).to.be.revertedWith(
                    "INVALID_FACTOR",
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

        it("should not allow non-owner add assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).addCollateralAsset(ADDRESS_TWO, 1, ADDRESS_TWO),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should not allow non-owner update assets", async function () {
            await expect(
                this.kresko.connect(this.userOne).updateCollateralFactor(ADDRESS_ONE, ZERO_POINT_FIVE),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(
                this.kresko.connect(this.userOne).updateCollateralOracle(ADDRESS_ONE, ADDRESS_TWO),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
