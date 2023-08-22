import { toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture, Role, defaultMintAmount, defaultKrAssetArgs } from "@utils/test";
import { KreskoAssetAnchor } from "types/typechain/src/contracts/kresko-asset/KreskoAssetAnchor";

describe("KreskoAssetAnchor", () => {
    let KreskoAsset: KreskoAsset;
    let KreskoAssetAnchor: KreskoAssetAnchor;
    withFixture(["minter-test", "kresko-assets", "collaterals"]);
    beforeEach(async function () {
        const asset = hre.krAssets.find(asset => asset!.deployArgs!.symbol === defaultKrAssetArgs.symbol)!;
        KreskoAsset = asset.contract;
        KreskoAssetAnchor = asset.anchor;

        // Grant minting rights for test deployer
        await Promise.all([
            KreskoAsset.grantRole(Role.OPERATOR, hre.addr.deployer),
            KreskoAssetAnchor.grantRole(Role.OPERATOR, hre.addr.deployer),
            KreskoAsset.approve(KreskoAssetAnchor.address, hre.ethers.constants.MaxUint256),
        ]);
    });

    describe("#minting and burning", () => {
        it("tracks the supply of underlying", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            expect(await KreskoAssetAnchor.totalAssets()).to.equal(defaultMintAmount);
            expect(await KreskoAssetAnchor.totalSupply()).to.equal(0);
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            expect(await KreskoAssetAnchor.totalAssets()).to.equal(defaultMintAmount.add(defaultMintAmount));
            expect(await KreskoAssetAnchor.totalSupply()).to.equal(0);
        });

        it.skip("mints 1:1 with no rebases", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            await KreskoAssetAnchor.mint(defaultMintAmount, hre.addr.deployer);

            expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(KreskoAssetAnchor.address)).to.equal(defaultMintAmount);
            expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
        });

        it.skip("deposits 1:1 with no rebases", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            await KreskoAssetAnchor.deposit(defaultMintAmount, hre.addr.deployer);

            expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(KreskoAssetAnchor.address)).to.equal(defaultMintAmount);
            expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
        });

        it.skip("redeems 1:1 with no rebases", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            await KreskoAssetAnchor.mint(defaultMintAmount, hre.addr.deployer);
            await KreskoAssetAnchor.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
            expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(KreskoAssetAnchor.address)).to.equal(0);
            expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
        });

        it.skip("withdraws 1:1 with no rebases", async function () {
            await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
            await KreskoAssetAnchor.deposit(defaultMintAmount, hre.addr.deployer);
            await KreskoAssetAnchor.withdraw(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
            expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
            expect(await KreskoAsset.balanceOf(KreskoAssetAnchor.address)).to.equal(0);
            expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
        });

        describe.skip("#rebases", () => {
            describe("#conversions", () => {
                it("mints 1:1 and redeems 1:2 after 1:2 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.mint(defaultMintAmount, hre.addr.deployer);

                    const denominator = 2;
                    const positive = true;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.mul(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("deposits 1:1 and withdraws 1:2 after 1:2 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, hre.addr.deployer);

                    const denominator = 2;
                    const positive = true;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.mul(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.withdraw(rebasedAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 1:6 after 1:6 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.mint(defaultMintAmount, hre.addr.deployer);

                    const denominator = 6;
                    const positive = true;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.mul(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });
                it("deposits 1:1 and withdraws 1:6 after 1:6 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, hre.addr.deployer);

                    const denominator = 6;
                    const positive = true;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.mul(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.withdraw(rebasedAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 2:1 after 2:1 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.mint(defaultMintAmount, hre.addr.deployer);

                    const denominator = 2;
                    const positive = false;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.div(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("deposits 1:1 and withdraws 2:1 after 2:1 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, hre.addr.deployer);

                    const denominator = 2;
                    const positive = false;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.div(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.withdraw(rebasedAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("mints 1:1 and redeems 6:1 after 6:1 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.mint(defaultMintAmount, hre.addr.deployer);

                    const denominator = 6;
                    const positive = false;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.div(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.redeem(defaultMintAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });

                it("deposits 1:1 and withdraws 6:1 after 6:1 rebase", async function () {
                    await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                    await KreskoAssetAnchor.deposit(defaultMintAmount, hre.addr.deployer);

                    const denominator = 6;
                    const positive = false;
                    await KreskoAsset.rebase(toBig(denominator), positive, []);

                    const rebasedAmount = defaultMintAmount.div(denominator);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
                    expect(await KreskoAssetAnchor.totalAssets()).to.equal(rebasedAmount);

                    await KreskoAssetAnchor.withdraw(rebasedAmount, hre.addr.deployer, hre.addr.deployer);
                    expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(rebasedAmount);
                    expect(await KreskoAssetAnchor.balanceOf(hre.addr.deployer)).to.equal(0);
                    expect(await KreskoAssetAnchor.balanceOf(KreskoAsset.address)).to.equal(0);
                });
            });
        });
    });
});
