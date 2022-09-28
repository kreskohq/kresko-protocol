import hre from "hardhat";
import { expect } from "@test/chai";
import { withFixture, Role, defaultMintAmount } from "@utils/test";
import { KreskoAssetAnchor } from "types/typechain/src/contracts/krAsset/KreskoAssetAnchor";

describe("KreskoAssetAnchor", () => {
    let addr: Addresses;
    let KreskoAsset: KreskoAsset;
    let KreskoAssetAnchor: KreskoAssetAnchor;
    before(() => {
        addr = hre.addr;
    });
    withFixture(["minter-test", "krAsset"]);
    beforeEach(async function () {
        KreskoAsset = hre.krAssets[0].contract;
        KreskoAssetAnchor = hre.krAssets[0].anchor;
        // Grant minting rights for test deployer
        await Promise.all([
            KreskoAsset.grantRole(Role.OPERATOR, addr.deployer),
            KreskoAssetAnchor.grantRole(Role.OPERATOR, addr.deployer),
            KreskoAsset.approve(KreskoAssetAnchor.address, hre.ethers.constants.MaxUint256),
        ]);
    });

    describe("#minting and burning", () => {
        it("tracks the supply of underlying", async function () {
            await KreskoAsset.mint(addr.deployer, defaultMintAmount);
            expect(await KreskoAssetAnchor.totalAssets()).to.equal(defaultMintAmount);
            expect(await KreskoAssetAnchor.totalSupply()).to.equal(0);
        });
        it("mints 1:1 by default", async function () {
            await KreskoAsset.mint(addr.deployer, defaultMintAmount);
            await KreskoAssetAnchor.deposit(defaultMintAmount, addr.deployer);

            expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(0);
            expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(defaultMintAmount);
        });

        it("burns 1:1 by default", async function () {
            await KreskoAsset.mint(addr.deployer, defaultMintAmount);
            await KreskoAssetAnchor.deposit(defaultMintAmount, addr.deployer);
            await KreskoAssetAnchor.withdraw(defaultMintAmount, addr.deployer, addr.deployer);
            expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(defaultMintAmount);
        });

        describe("#rebases", () => {
            describe("#conversions", () => {
                it("mints 1:1 and redeems 1:2 after 1:2 rebase", async function () {
                    await KreskoAsset.mint(addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, addr.deployer);

                    const denominator = 2;
                    const positive = true;
                    await KreskoAsset.rebase(hre.toBig(denominator), positive);

                    const rebasedAmount = defaultMintAmount.mul(denominator);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, addr.deployer, addr.deployer);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 1:6 after 1:6 rebase", async function () {
                    await KreskoAsset.mint(addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, addr.deployer);

                    const denominator = 6;
                    const positive = true;
                    await KreskoAsset.rebase(hre.toBig(denominator), positive);

                    const rebasedAmount = defaultMintAmount.mul(denominator);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, addr.deployer, addr.deployer);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 2:1 after 2:1 rebase", async function () {
                    await KreskoAsset.mint(addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, addr.deployer);

                    const denominator = 2;
                    const positive = false;
                    await KreskoAsset.rebase(hre.toBig(denominator), positive);

                    const rebasedAmount = defaultMintAmount.div(denominator);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, addr.deployer, addr.deployer);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 6:1 after 6:1 rebase", async function () {
                    await KreskoAsset.mint(addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, addr.deployer);

                    const denominator = 6;
                    const positive = false;
                    await KreskoAsset.rebase(hre.toBig(denominator), positive);

                    const rebasedAmount = defaultMintAmount.div(denominator);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, addr.deployer, addr.deployer);
                    expect(await KreskoAsset.balanceOf(addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });
            });
        });
    });
});
