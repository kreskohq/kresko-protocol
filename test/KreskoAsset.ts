import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { KreskoAsset } from "../typechain/KreskoAsset";
import { Signers } from "../types";

describe("KreskoAsset", function () {
    before(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.operator = signers[1];
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
            await hre.upgrades.deployProxy(
                kreskoAssetFactory,
                [name, symbol, this.signers.admin.address, this.operator.address],
                {
                    unsafeAllow: ["constructor"],
                },
            )
        ).deployed();
    });

    describe("#initialize", function () {
        it("should initialize the contract with the correct parameters", async function () {
            expect(await this.kreskoAsset.name()).to.equal("Test Asset");
            expect(await this.kreskoAsset.symbol()).to.equal("TEST");
            expect(
                await this.kreskoAsset.hasRole(this.kreskoAsset.DEFAULT_ADMIN_ROLE(), this.signers.admin.address),
            ).to.equal(true);
            expect(await this.kreskoAsset.hasRole(this.kreskoAsset.OPERATOR_ROLE(), this.operator.address)).to.equal(
                true,
            );
        });

        it("should not allow being called more than once", async function () {
            expect(
                this.kreskoAsset.initialize("foo", "bar", this.signers.admin.address, this.operator.address),
            ).to.be.revertedWith("Initializable: contract is already initialized");
        });
    });

    describe("#mint", function () {
        beforeEach(async function () {
            this.mintAmount = 125;
        });

        it("should allow the operator to mint to any address", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.operator.address)).to.equal(0);

            await this.kreskoAsset.connect(this.operator).mint(this.operator.address, this.mintAmount);

            // Check total supply and user's balances increased
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.operator.address)).to.equal(this.mintAmount);
        });

        it("should allow the operator to mint to owner's address", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(0);

            await this.kreskoAsset.connect(this.operator).mint(this.signers.admin.address, this.mintAmount);

            // Check total supply and owner's balances increased
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(this.mintAmount);
        });

        it("should not allow admin to mint any tokens", async function () {
            await expect(
                this.kreskoAsset.connect(this.signers.admin).mint(this.signers.admin.address, this.mintAmount),
            ).to.be.revertedWith(
                `AccessControl: account ${this.signers.admin.address.toLowerCase()} is missing role 0x8952ae23cc3fea91b9dba0cefa16d18a26ca2bf124b54f42b5d04bce3aacecd2`,
            );
        });

        it("should not allow non-operator addresses to mint tokens", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.operator.address)).to.equal(0);

            await expect(
                this.kreskoAsset.connect(this.signers.admin).mint(this.operator.address, this.mintAmount),
            ).to.be.revertedWith(
                `AccessControl: account ${this.signers.admin.address.toLowerCase()} is missing role 0x8952ae23cc3fea91b9dba0cefa16d18a26ca2bf124b54f42b5d04bce3aacecd2`,
            );

            // Check total supply and user's balances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.operator.address)).to.equal(0);
        });
    });

    describe("#burn", function () {
        beforeEach(async function () {
            this.mintAmount = 250;
            await this.kreskoAsset.connect(this.operator).mint(this.signers.admin.address, this.mintAmount);
        });

        it("should allow the operator to burn tokens from user's address (without token allowance)", async function () {
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);

            await this.kreskoAsset.connect(this.operator).burn(this.signers.admin.address, this.mintAmount);

            // Check total supply and user's balances decreased
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.operator.address)).to.equal(0);
            // Confirm that owner doesn't hold any tokens
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(0);
        });

        it("should allow the operator to burn tokens from user's address without changing existing allowances", async function () {
            await this.kreskoAsset.connect(this.signers.admin).approve(this.operator.address, this.mintAmount);

            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.allowance(this.signers.admin.address, this.operator.address)).to.equal(
                this.mintAmount,
            );

            await this.kreskoAsset.connect(this.operator).burn(this.signers.admin.address, this.mintAmount);

            // Check total supply and user's balances decreased
            expect(await this.kreskoAsset.totalSupply()).to.equal(0);
            expect(await this.kreskoAsset.balanceOf(this.operator.address)).to.equal(0);
            // Confirm that owner doesn't hold any tokens
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(0);
            // Confirm that token allowances are unchanged
            expect(await this.kreskoAsset.allowance(this.signers.admin.address, this.operator.address)).to.equal(
                this.mintAmount,
            );
        });

        it("should not allow the operator to burn more tokens than user holds", async function () {
            const userBalance = await this.kreskoAsset.balanceOf(this.signers.admin.address);
            const overUserBalance = userBalance + 1;

            await expect(
                this.kreskoAsset.connect(this.operator).burn(this.signers.admin.address, overUserBalance),
            ).to.be.revertedWith("ERC20: burn amount exceeds balance");

            // Check total supply and user's balances are unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(this.mintAmount);
        });

        it("should not allow non-operator addresses to burn tokens", async function () {
            await expect(
                this.kreskoAsset.connect(this.userTwo).burn(this.signers.admin.address, this.mintAmount),
            ).to.be.revertedWith(
                `AccessControl: account ${this.userTwo.address.toLowerCase()} is missing role 0x8952ae23cc3fea91b9dba0cefa16d18a26ca2bf124b54f42b5d04bce3aacecd2`,
            );

            // Check total supply and user's balances unchanged
            expect(await this.kreskoAsset.totalSupply()).to.equal(this.mintAmount);
            expect(await this.kreskoAsset.balanceOf(this.signers.admin.address)).to.equal(this.mintAmount);
        });
    });
});
