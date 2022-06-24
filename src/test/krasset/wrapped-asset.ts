import hre from "hardhat";
import { expect } from "chai";
import { withFixture, Role, defaultMintAmount } from "@utils/test";

describe("Wrapped KreskoAsset", () => {
    let KreskoAsset: KreskoAsset;
    let WrappedKreskoAsset: WrappedKreskoAsset;
    withFixture("kreskoAsset");
    beforeEach(async function () {
        [KreskoAsset, WrappedKreskoAsset] = hre.krAssets[0];
        // Grant minting rights for test deployer
        await KreskoAsset.grantRole(Role.OPERATOR, hre.addr.deployer);
        // Grant operator role for the test deployer on the wrapped asset
        await WrappedKreskoAsset.grantRole(Role.OPERATOR, hre.addr.deployer);
        // Approve the wrapped asset
        await KreskoAsset.approve(WrappedKreskoAsset.address, hre.ethers.constants.MaxUint256);
    });

    describe("#wrapping", () => {
        it("tracks the supply of underlying", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            expect(await WrappedKreskoAsset.totalAssets()).to.equal(defaultMintAmount);
            expect(await WrappedKreskoAsset.totalSupply()).to.equal(0);
        });
        it("mints 1:1 by default", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            await WrappedKreskoAsset.deposit(defaultMintAmount, hre.addr.deployer);

            expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
            expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
        });

        it("burns 1:1 by default", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            await WrappedKreskoAsset.deposit(defaultMintAmount, hre.addr.deployer);
            await WrappedKreskoAsset.withdraw(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
            expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
        });

        describe("#rebalanced", () => {
            describe("#conversions", () => {
                it("mints 1:1 and redeems 1:2 after 1:2 expansion", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await WrappedKreskoAsset.deposit(defaultMintAmount, hre.addr.deployer);

                    const ratio = 2;
                    const expand = true;
                    await KreskoAsset.setRebalance(hre.toBig(ratio), expand);

                    const expandedAmount = defaultMintAmount.mul(ratio);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await WrappedKreskoAsset.totalAssets()).to.equal(expandedAmount);

                    await WrappedKreskoAsset.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(expandedAmount);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 1:6 after 1:6 expansion", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await WrappedKreskoAsset.deposit(defaultMintAmount, hre.addr.deployer);

                    const ratio = 6;
                    const expand = true;
                    await KreskoAsset.setRebalance(hre.toBig(ratio), expand);

                    const expandedAmount = defaultMintAmount.mul(ratio);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await WrappedKreskoAsset.totalAssets()).to.equal(expandedAmount);

                    await WrappedKreskoAsset.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(expandedAmount);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 2:1 after 2:1 reduction", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await WrappedKreskoAsset.deposit(defaultMintAmount, hre.addr.deployer);

                    const ratio = 2;
                    const expand = false;
                    await KreskoAsset.setRebalance(hre.toBig(ratio), expand);

                    const expandedAmount = defaultMintAmount.div(ratio);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await WrappedKreskoAsset.totalAssets()).to.equal(expandedAmount);

                    await WrappedKreskoAsset.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(expandedAmount);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 6:1 after 6:1 reduction", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await WrappedKreskoAsset.deposit(defaultMintAmount, hre.addr.deployer);

                    const ratio = 6;
                    const expand = false;
                    await KreskoAsset.setRebalance(hre.toBig(ratio), expand);

                    const expandedAmount = defaultMintAmount.div(ratio);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await WrappedKreskoAsset.totalAssets()).to.equal(expandedAmount);

                    await WrappedKreskoAsset.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(expandedAmount);
                    expect(await WrappedKreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await WrappedKreskoAsset.balanceOf(KreskoAsset.address)).to.equal(0);
                });
            });
        });
    });
});
