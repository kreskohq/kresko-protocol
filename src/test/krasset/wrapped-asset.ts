import hre from "hardhat";
import { expect } from "chai";
import { withFixture } from "../utils/diamond";
import roles from "../utils/roles";

describe.only("Wrapped KreskoAsset", () => {
    let KreskoAsset: KreskoAsset;
    let FixedKreskoAsset: FixedKreskoAsset;
    withFixture("kreskoAsset");
    beforeEach(async function () {
        [KreskoAsset, FixedKreskoAsset] = hre.krAssets[0];
        // Grant minting rights for test deployer
        await KreskoAsset.grantRole(roles.OPERATOR, this.addresses.deployer);
        // Grant operator role for the test deployer on the wrapped asset
        await FixedKreskoAsset.grantRole(roles.OPERATOR, this.addresses.deployer);
        // Approve the wrapped asset
        await KreskoAsset.approve(FixedKreskoAsset.address, hre.ethers.constants.MaxUint256);
    });

    describe("#wrapping", () => {
        const defaultAmount = hre.toBig("100");

        it("tracks the supply of underlying", async function () {
            await KreskoAsset.mint(this.addresses.deployer, defaultAmount);
            expect(await FixedKreskoAsset.totalAssets()).to.equal(defaultAmount);
            expect(await FixedKreskoAsset.totalSupply()).to.equal(0);
        });
        it("mints 1:1 by default", async function () {
            await KreskoAsset.mint(this.addresses.deployer, defaultAmount);
            await FixedKreskoAsset.deposit(defaultAmount, this.addresses.deployer);

            expect(await KreskoAsset.balanceOf(this.addresses.deployer)).to.equal(0);
            expect(await FixedKreskoAsset.balanceOf(this.addresses.deployer)).to.equal(defaultAmount);
        });

        it("burns 1:1 by default", async function () {
            await KreskoAsset.mint(this.addresses.deployer, defaultAmount);
            await FixedKreskoAsset.deposit(defaultAmount, this.addresses.deployer);
            await FixedKreskoAsset.withdraw(defaultAmount, this.addresses.deployer, this.addresses.deployer);
            expect(await FixedKreskoAsset.balanceOf(this.addresses.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(this.addresses.deployer)).to.equal(defaultAmount);
        });

        describe("#rebalanced", () => {
            describe("#conversions", () => {
                it("mints 1:1 and redeems 1:2 after 1:2 expansion", async function () {
                    await KreskoAsset.mint(this.addresses.deployer, defaultAmount);
                    await FixedKreskoAsset.deposit(defaultAmount, this.addresses.deployer);

                    const ratio = 2;
                    const expand = true;
                    await KreskoAsset.setRebalance(hre.toBig(ratio), expand);

                    const expandedAmount = defaultAmount.mul(2);
                    expect(await KreskoAsset.balanceOf(this.addresses.deployer)).to.equal(0);
                    expect(await FixedKreskoAsset.balanceOf(this.addresses.deployer)).to.equal(defaultAmount);
                    expect(await FixedKreskoAsset.totalAssets()).to.equal(expandedAmount);

                    await FixedKreskoAsset.redeem(defaultAmount, this.addresses.deployer, this.addresses.deployer);
                    expect(await KreskoAsset.balanceOf(this.addresses.deployer)).to.equal(expandedAmount);
                    expect(await FixedKreskoAsset.balanceOf(this.addresses.deployer)).to.equal(0);
                    expect(await FixedKreskoAsset.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 2:1 after 2:1 reduction", async function () {
                    await KreskoAsset.mint(this.addresses.deployer, defaultAmount);
                    await FixedKreskoAsset.deposit(defaultAmount, this.addresses.deployer);

                    const ratio = 2;
                    const expand = false;
                    await KreskoAsset.setRebalance(hre.toBig(ratio), expand);

                    const expandedAmount = defaultAmount.div(2);
                    expect(await KreskoAsset.balanceOf(this.addresses.deployer)).to.equal(0);
                    expect(await FixedKreskoAsset.balanceOf(this.addresses.deployer)).to.equal(defaultAmount);
                    expect(await FixedKreskoAsset.totalAssets()).to.equal(expandedAmount);

                    await FixedKreskoAsset.redeem(defaultAmount, this.addresses.deployer, this.addresses.deployer);
                    expect(await KreskoAsset.balanceOf(this.addresses.deployer)).to.equal(expandedAmount);
                    expect(await FixedKreskoAsset.balanceOf(this.addresses.deployer)).to.equal(0);
                    expect(await FixedKreskoAsset.balanceOf(KreskoAsset.address)).to.equal(0);
                });
            });
        });
    });
});
