import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { KreskoAsset } from "../typechain/KreskoAsset";
import { Signers } from "../types";

const { deployContract } = hre.waffle;

describe("KreskoAsset", function () {
    before(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];
    });

    beforeEach(async function () {
        const name: string = "Test Asset";
        const symbol: string = "TEST";
        const kreskoAssetArtifact: Artifact = await hre.artifacts.readArtifact("KreskoAsset");

        this.kreskoAsset = <KreskoAsset>await deployContract(this.signers.admin, kreskoAssetArtifact, [name, symbol]);
    });

    describe("Deployment", function () {
        it("should initialize the contract with the correct parameters", async function () {
            expect(await this.kreskoAsset.name()).to.equal("Test Asset");
            expect(await this.kreskoAsset.symbol()).to.equal("TEST");
            expect(await this.kreskoAsset.owner()).to.equal(this.signers.admin.address);
        });
    });

    describe("#mint", function () {
        beforeEach(async function () {
            this.mintAmount = 125;
        });

        it("should allow the owner to mint to any address", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(0);

            await this.kreskoAsset.connect(this.signers.admin).mint(this.userOne.address, this.mintAmount);

            // Check total supply and user's balances increased
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(this.mintAmount);
        });

        it("should allow the owner to mint to owner's address", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(0);

            await this.kreskoAsset.connect(this.signers.admin).mint(this.signers.admin.address, this.mintAmount);

            // Check total supply and owner's balances increased
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(this.mintAmount);
        });

        it("should not allow non-owner addresses to mint tokens", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(0);

            await expect(
                this.kreskoAsset.connect(this.userOne).mint(this.userOne.address, this.mintAmount),
            ).to.be.revertedWith("Ownable: caller is not the owner");

            // Check total supply and user's balances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(0);
        });
    });

    describe("#burn", function () {
        beforeEach(async function () {
            this.mintAmount = 250;
            await this.kreskoAsset.connect(this.signers.admin).mint(this.userOne.address, this.mintAmount);
        });

        it("should allow the owner to burn tokens from user's address", async function () {
            await this.kreskoAsset.connect(this.userOne).approve(this.signers.admin.address, this.mintAmount);

            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.allowance(this.userOne.address, this.signers.admin.address)).to.equal(this.mintAmount);

            await this.kreskoAsset.connect(this.signers.admin).burn(this.userOne.address, this.mintAmount);

            // Check total supply and user's balances decreased
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(0);
            // Confirm that owner doesn't hold any tokens
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(0);
        });

        it("should not allow the owner to burn more tokens than allowances permit", async function () {
            await this.kreskoAsset.connect(this.userOne).approve(this.signers.admin.address, this.mintAmount);

            const ownerAllowance = await this.kreskoAsset.allowance(this.userOne.address, this.signers.admin.address);
            const overOwnerAllowance = ownerAllowance + 1;

            await expect(this.kreskoAsset.connect(this.signers.admin).burn(this.userOne.address, overOwnerAllowance)).to.be.revertedWith(
                "ERC20: burn amount exceeds balance",
            );

            // Check total supply, user's balances, and owner's allowances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.allowance(this.userOne.address, this.signers.admin.address)).to.equal(this.mintAmount);
        });

        it("should not allow non-owner addresses to burn tokens", async function () {
            await expect(this.kreskoAsset.connect(this.userOne).burn(this.userOne.address, this.mintAmount)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            // Check total supply and user's balances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(this.mintAmount);
        });
    });
});
