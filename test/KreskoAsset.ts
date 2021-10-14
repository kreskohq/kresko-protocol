import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { KreskoAsset } from "../typechain/KreskoAsset";
import { Signers } from "../types";

describe("KreskoAsset", function () {
    before(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];

        // We intentionally allow constructor that calls the initializer
        // modifier and explicitly allow this in calls to `deployProxy`.
        // The upgrades library will still print warnings, so to avoid clutter
        // we just silence those here.
        console.log("Intentionally silencing Upgrades warnings");
        hre.upgrades.silenceWarnings();
    });

    beforeEach(async function () {
        const name: string = "Test Asset";
        const symbol: string = "TEST";
        const kreskoAssetFactory = await hre.ethers.getContractFactory("KreskoAsset");
        this.kreskoAsset = <KreskoAsset>await (
            await hre.upgrades.deployProxy(kreskoAssetFactory, [name, symbol, this.signers.admin.address], {
                unsafeAllow: ["constructor"],
            })
        ).deployed();
    });

    describe("#initialize", function () {
        it("should initialize the contract with the correct parameters", async function () {
            expect(await this.kreskoAsset.name()).to.equal("Test Asset");
            expect(await this.kreskoAsset.symbol()).to.equal("TEST");
            expect(await this.kreskoAsset.owner()).to.equal(this.signers.admin.address);
        });

        it("should not allow being called more than once", async function () {
            expect(this.kreskoAsset.initialize("foo", "bar", this.signers.admin.address)).to.be.revertedWith(
                "Initializable: contract is already initialized",
            );
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

        it("should allow the owner to burn from owner's address", async function () {
            await this.kreskoAsset.connect(this.userOne).transfer(this.signers.admin.address, this.mintAmount);

            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(this.mintAmount);

            await this.kreskoAsset.connect(this.signers.admin).burn(this.mintAmount);

            // Check total supply and owner's balances decreased
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(0);
        });

        it("should not allow the owner to burn more tokens that it holds", async function () {
            await this.kreskoAsset.connect(this.userOne).transfer(this.signers.admin.address, this.mintAmount);

            const ownerBalance = await this.kreskoAsset.balanceOf(this.signers.admin.address);
            const overOwnerBalance = ownerBalance + 1;

            await expect(this.kreskoAsset.connect(this.signers.admin).burn(overOwnerBalance)).to.be.revertedWith(
                "ERC20: burn amount exceeds balance",
            );

            // Check total supply and owner's balances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(this.mintAmount);
        });

        it("should not allow non-owner addresses to burn tokens", async function () {
            await expect(this.kreskoAsset.connect(this.userOne).burn(this.mintAmount)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            // Check total supply and user's balances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.userOne.address)).to.equal(this.mintAmount);
        });
    });
});
