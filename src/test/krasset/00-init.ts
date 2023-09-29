import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import { anchorTokenPrefix } from "@deploy-config/shared";
import { expect } from "@test/chai";
import { DefaultFixture, defaultFixture } from "@utils/test/fixtures";
import Role from "@utils/test/roles";
import type { KreskoAssetAnchor } from "types/typechain";

const { name, symbol } = testnetConfigs.hardhat.assets.filter(a => !!a.krAssetConfig)[1];

describe("KreskoAsset", function () {
    let KreskoAsset: KreskoAsset;
    let KreskoAssetAnchor: KreskoAssetAnchor;
    let f: DefaultFixture;

    describe("#initialization - anchor", () => {
        beforeEach(async function () {
            f = await defaultFixture();
            const deployment = f.krAssets.find(k => k.config!.args.symbol === symbol)!;
            KreskoAsset = deployment.contract as unknown as KreskoAsset;
            KreskoAssetAnchor = deployment.anchor! as unknown as KreskoAssetAnchor;
        });
        it("cant initialize twice", async function () {
            await expect(KreskoAsset.initialize(name!, symbol, 18, hre.addr.deployer, hre.Diamond.address)).to.be
                .reverted;
        });

        it.skip("cant initialize implementation", async function () {
            const deployment = await hre.deployments.get(symbol);
            const implementationAddress = deployment!.implementation;
            expect(implementationAddress).to.not.equal(hre.ethers.constants.AddressZero);
            const KreskoAssetImpl = await hre.ethers.getContractAt("KreskoAsset", implementationAddress!);

            await expect(KreskoAssetImpl.initialize(name!, symbol, 18, hre.addr.deployer, hre.Diamond.address)).to.be
                .reverted;
        });

        it("sets correct state", async function () {
            expect(await KreskoAsset.name()).to.equal(name);
            expect(await KreskoAsset.symbol()).to.equal(symbol);
            expect(await KreskoAsset.kresko()).to.equal(hre.Diamond.address);
            expect(await KreskoAsset.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true);
            expect(await KreskoAsset.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

            expect(await KreskoAsset.totalSupply()).to.equal(0);
            expect(await KreskoAsset.isRebased()).to.equal(false);

            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).to.equal(0);
            expect(rebaseInfo.positive).to.equal(false);
        });

        it("can reinitialize metadata", async function () {
            const newName = "foo";
            const newSymbol = "bar";
            await expect(KreskoAsset.reinitializeERC20(newName, newSymbol, 2)).to.not.be.reverted;
            expect(await KreskoAsset.name()).to.equal(newName);
            expect(await KreskoAsset.symbol()).to.equal(newSymbol);
        });
    });

    describe("#initialization - wrapped", () => {
        it("cant initialize twice", async function () {
            await expect(KreskoAssetAnchor.initialize(KreskoAsset.address, name!, symbol, hre.addr.deployer)).to.be
                .reverted;
        });
        it("sets correct state", async function () {
            expect(await KreskoAssetAnchor.name()).to.equal(name);
            expect(await KreskoAssetAnchor.symbol()).to.equal(anchorTokenPrefix + symbol);
            expect(await KreskoAssetAnchor.asset()).to.equal(KreskoAsset.address);
            expect(await KreskoAssetAnchor.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true);
            expect(await KreskoAssetAnchor.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

            expect(await KreskoAssetAnchor.totalSupply()).to.equal(0);
            expect(await KreskoAssetAnchor.totalAssets()).to.equal(await KreskoAsset.totalSupply());

            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).to.equal(0);
            expect(rebaseInfo.positive).to.equal(false);
        });

        it.skip("cant initialize implementation", async function () {
            const deployment = await hre.deployments.get(anchorTokenPrefix + symbol);
            const implementationAddress = deployment!.implementation;

            expect(implementationAddress).to.not.equal(hre.ethers.constants.AddressZero);
            const KreskoAssetAnchorImpl = await hre.ethers.getContractAt("KreskoAssetAnchor", implementationAddress!);

            await expect(KreskoAssetAnchorImpl.initialize(KreskoAsset.address, name!, symbol, hre.addr.deployer)).to.be
                .reverted;
        });

        it("can reinitialize metadata", async function () {
            const newName = "foo";
            const newSymbol = "bar";
            await expect(KreskoAssetAnchor.reinitializeERC20(newName, newSymbol, 2)).to.not.be.reverted;
            expect(await KreskoAssetAnchor.name()).to.equal(newName);
            expect(await KreskoAssetAnchor.symbol()).to.equal(newSymbol);
            await KreskoAssetAnchor.reinitializeERC20(name!, symbol, 3);
        });
    });
});
