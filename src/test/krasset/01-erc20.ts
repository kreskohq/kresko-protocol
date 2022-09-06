import { expect } from "@test/chai";
import { Role, withFixture } from "@utils/test";
import { users } from "hardhat";

describe("KreskoAsset", function () {
    withFixture("kresko-asset");

    beforeEach(async function () {
        this.owner = users.deployer;
        this.krAsset = this.krAssets[0];
        this.mintAmount = 125;
        await this.krAsset.contract.grantRole(Role.OPERATOR, this.owner.address);
    });

    describe("#mint", function () {
        it("should allow the owner to mint to their own address", async function () {
            expect(await this.krAsset.contract.totalSupply()).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(this.owner.address)).to.equal(0);

            await this.krAsset.contract.connect(this.owner).mint(this.owner.address, this.mintAmount);

            // Check total supply and owner's balances increased
            expect(await this.krAsset.contract.totalSupply()).to.equal(this.mintAmount);
            expect(await this.krAsset.contract.balanceOf(this.owner.address)).to.equal(this.mintAmount);
        });

        it("should allow the asset owner to mint to another address", async function () {
            expect(await this.krAsset.contract.totalSupply()).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(0);

            await this.krAsset.contract.connect(this.owner).mint(users.userOne.address, this.mintAmount);

            // Check total supply and user's balances increased
            expect(await this.krAsset.contract.totalSupply()).to.equal(this.mintAmount);
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(this.mintAmount);
        });

        it("should not allow non-owner addresses to mint tokens", async function () {
            expect(await this.krAsset.contract.totalSupply()).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(this.owner.address)).to.equal(0);

            await expect(
                this.krAsset.contract.connect(users.userOne).mint(this.owner.address, this.mintAmount),
            ).to.be.revertedWith(
                `AccessControl: account ${users.userOne.address.toLowerCase()} is missing role 0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd`,
            );

            // Check total supply and all account balances unchanged
            expect(await this.krAsset.contract.totalSupply()).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(this.owner.address)).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(0);
        });

        it("should not allow admin to mint tokens", async function () {
            await expect(
                this.krAsset.contract.connect(users.admin).mint(this.owner.address, this.mintAmount),
            ).to.be.revertedWith(
                `AccessControl: account ${users.admin.address.toLowerCase()} is missing role 0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd`,
            );
        });
    });

    describe("#burn", function () {
        beforeEach(async function () {
            this.mintAmount = 250;
            await this.krAsset.contract.connect(this.owner).mint(users.userOne.address, this.mintAmount);
        });

        it("should allow the owner to burn tokens from user's address (without token allowance)", async function () {
            expect(await this.krAsset.contract.totalSupply()).to.equal(this.mintAmount);

            await this.krAsset.contract.connect(this.owner).burn(users.userOne.address, this.mintAmount);

            // Check total supply and user's balances decreased
            expect(await this.krAsset.contract.totalSupply()).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(this.owner.address)).to.equal(0);
            // Confirm that owner doesn't hold any tokens
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(0);
        });

        it("should allow the operator to burn tokens from user's address without changing existing allowances", async function () {
            await this.krAsset.contract.connect(this.owner).approve(users.userOne.address, this.mintAmount);

            expect(await this.krAsset.contract.totalSupply()).to.equal(this.mintAmount);
            expect(await this.krAsset.contract.allowance(this.owner.address, users.userOne.address)).to.equal(
                this.mintAmount,
            );

            await this.krAsset.contract.connect(this.owner).burn(users.userOne.address, this.mintAmount);

            // Check total supply and user's balances decreased
            expect(await this.krAsset.contract.totalSupply()).to.equal(0);
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(0);
            // Confirm that owner doesn't hold any tokens
            expect(await this.krAsset.contract.balanceOf(this.owner.address)).to.equal(0);
            // Confirm that token allowances are unchanged
            expect(await this.krAsset.contract.allowance(this.owner.address, users.userOne.address)).to.equal(
                this.mintAmount,
            );
        });

        it("should not allow the operator to burn more tokens than user holds", async function () {
            const userBalance = await this.krAsset.contract.balanceOf(users.userOne.address);
            const overUserBalance = Number(userBalance) + 1;

            // gh-actions fix
            await expect(this.krAsset.contract.connect(this.owner).burn(users.userOne.address, overUserBalance)).to.be
                .reverted;

            // await expect(
            //     this.krAsset.contract.connect(this.owner).burn(users.userOne.address, overUserBalance),
            // ).to.be.revertedWith(
            //     "VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)",
            // );

            // Check total supply and user's balances are unchanged
            expect(await this.krAsset.contract.totalSupply()).to.equal(this.mintAmount);
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(this.mintAmount);
        });

        it("should not allow non-operator addresses to burn tokens", async function () {
            await expect(
                this.krAsset.contract.connect(users.userTwo).burn(users.userOne.address, this.mintAmount),
            ).to.be.revertedWith(
                `AccessControl: account ${users.userTwo.address.toLowerCase()} is missing role 0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd`,
            );

            // Check total supply and user's balances unchanged
            expect(await this.krAsset.contract.totalSupply()).to.equal(this.mintAmount);
            expect(await this.krAsset.contract.balanceOf(users.userOne.address)).to.equal(this.mintAmount);
        });
    });
});
