import hre from "hardhat";
import { expect } from "@test/chai";
import { Error, Role, withFixture } from "@utils/test";
import { testnetConfigs } from "@deploy-config/testnet";
import { anchorTokenPrefix } from "@deploy-config/shared";
import type { KreskoAssetAnchor } from "types/typechain/src/contracts/kreskoasset/KreskoAssetAnchor";

const { name, symbol } = testnetConfigs.hardhat.krAssets[0];

describe("KreskoAsset", function () {
    let KreskoAsset: KreskoAsset;
    let KreskoAssetAnchor: KreskoAssetAnchor;

    let addr: Addresses;
    beforeEach(async function () {
        addr = await hre.getAddresses();
    });

    withFixture(["minter-test", "kresko-assets", "collaterals"]);
    describe("#initialization - anchor", () => {
        beforeEach(async function () {
            const deployment = this.krAssets.find(k => k.deployArgs.name === name);
            KreskoAsset = deployment.contract;
            KreskoAssetAnchor = deployment.anchor;
        });
        it("cant initialize twice", async function () {
            await expect(
                KreskoAsset.initialize(name, symbol, 18, addr.deployer, hre.Diamond.address),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("cant initialize implementation", async function () {
            const deployment = await hre.deployments.get(symbol);
            const implementationAddress = deployment.implementation;
            const KreskoAssetImpl = await hre.ethers.getContractAt("KreskoAsset", implementationAddress);

            await expect(
                KreskoAssetImpl.initialize(name, symbol, 18, addr.deployer, hre.Diamond.address),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("sets correct state", async function () {
            expect(await KreskoAsset.name()).to.equal(name);
            expect(await KreskoAsset.symbol()).to.equal(symbol);
            expect(await KreskoAsset.kresko()).to.equal(hre.Diamond.address);
            expect(await KreskoAsset.hasRole(Role.ADMIN, addr.deployer)).to.equal(true);
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
            await expect(KreskoAsset.updateMetaData(newName, newSymbol, 2)).to.not.be.revertedWith(
                Error.ALREADY_INITIALIZED_OZ,
            );
            expect(await KreskoAsset.name()).to.equal(newName);
            expect(await KreskoAsset.symbol()).to.equal(newSymbol);
        });
    });

    describe("#initialization - wrapped", () => {
        beforeEach(async function () {
            const deployment = hre.krAssets.find(k => k.deployArgs.name === name);
            KreskoAsset = deployment.contract;
            KreskoAssetAnchor = deployment.anchor;
        });
        it("cant initialize twice", async function () {
            await expect(
                KreskoAssetAnchor.initialize(KreskoAsset.address, name, symbol, addr.deployer),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("cant initialize implementation", async function () {
            const deployment = await hre.deployments.get(anchorTokenPrefix + symbol);
            const implementationAddress = deployment.implementation;
            const KreskoAssetAnchorImpl = await hre.ethers.getContractAt<KreskoAssetAnchor>(
                "KreskoAssetAnchor",
                implementationAddress,
            );

            await expect(
                KreskoAssetAnchorImpl.initialize(KreskoAsset.address, name, symbol, addr.deployer),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("can reinitialize metadata", async function () {
            const newName = "foo";
            const newSymbol = "bar";
            await expect(KreskoAssetAnchor.updateMetaData(newName, newSymbol, 2)).to.not.be.revertedWith(
                Error.ALREADY_INITIALIZED_OZ,
            );
            expect(await KreskoAssetAnchor.name()).to.equal(newName);
            expect(await KreskoAssetAnchor.symbol()).to.equal(newSymbol);
        });

        it("sets correct state", async function () {
            expect(await KreskoAssetAnchor.name()).to.equal(name);
            expect(await KreskoAssetAnchor.symbol()).to.equal(anchorTokenPrefix + symbol);
            expect(await KreskoAssetAnchor.asset()).to.equal(KreskoAsset.address);
            expect(await KreskoAssetAnchor.hasRole(Role.ADMIN, addr.deployer)).to.equal(true);
            expect(await KreskoAssetAnchor.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

            expect(await KreskoAssetAnchor.totalSupply()).to.equal(0);
            expect(await KreskoAssetAnchor.totalAssets()).to.equal(await KreskoAsset.totalSupply());

            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).to.equal(0);
            expect(rebaseInfo.positive).to.equal(false);
        });
    });
});
