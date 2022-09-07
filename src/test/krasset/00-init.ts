import hre from "hardhat";
import { expect } from "@test/chai";
import minterConfig from "../../config/minter";
import { withFixture, Role, Error } from "@utils/test";

const [name, symbol, underlyingSymbol] = minterConfig.krAssets.test[0];

describe("KreskoAsset", function () {
    let addr: Addresses;
    let KreskoAsset: KreskoAsset;
    let WrappedKreskoAsset: WrappedKreskoAsset;
    before(async function () {
        addr = hre.addr;
    });
    withFixture("kresko-asset");

    describe("#initialization - rebalancing", () => {
        beforeEach(async function () {
            KreskoAsset = hre.krAssets[0].contract;
            WrappedKreskoAsset = hre.krAssets[0].wrapper;
        });
        it("cant initialize twice", async function () {
            await expect(
                KreskoAsset.initialize(name, underlyingSymbol, 18, addr.deployer, hre.Diamond.address),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("cant initialize implementation", async function () {
            const deployment = await hre.deployments.get(underlyingSymbol);
            const implementationAddress = deployment.implementation;
            const KreskoAssetImpl = await hre.ethers.getContractAt("KreskoAsset", implementationAddress);

            await expect(
                KreskoAssetImpl.initialize(name, symbol, 18, addr.deployer, hre.Diamond.address),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("sets correct state", async function () {
            expect(await KreskoAsset.name()).to.equal(name);
            expect(await KreskoAsset.symbol()).to.equal(underlyingSymbol);
            expect(await KreskoAsset.kresko()).to.equal(hre.Diamond.address);
            expect(await KreskoAsset.hasRole(Role.ADMIN, addr.deployer)).to.equal(true);
            expect(await KreskoAsset.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

            expect(await KreskoAsset.totalSupply()).to.equal(0);
            expect(await KreskoAsset.rebalanced()).to.equal(false);

            const rebalance = await KreskoAsset.rebalance();
            expect(rebalance.rate).to.equal(0);
            expect(rebalance.expand).to.equal(false);
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
        withFixture("kresko-asset");
        beforeEach(async function () {
            KreskoAsset = hre.krAssets[0].contract;
            WrappedKreskoAsset = hre.krAssets[0].wrapper;
        });
        it("cant initialize twice", async function () {
            await expect(
                WrappedKreskoAsset.initialize(KreskoAsset.address, name, symbol, addr.deployer),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("cant initialize implementation", async function () {
            const deployment = await hre.deployments.get(symbol);
            const implementationAddress = deployment.implementation;
            const WrappedKreskoAssetImpl = await hre.ethers.getContractAt<WrappedKreskoAsset>(
                "WrappedKreskoAsset",
                implementationAddress,
            );

            await expect(
                WrappedKreskoAssetImpl.initialize(KreskoAsset.address, name, symbol, addr.deployer),
            ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
        });

        it("can reinitialize metadata", async function () {
            const newName = "foo";
            const newSymbol = "bar";
            await expect(WrappedKreskoAsset.updateMetaData(newName, newSymbol, 2)).to.not.be.revertedWith(
                Error.ALREADY_INITIALIZED_OZ,
            );
            expect(await WrappedKreskoAsset.name()).to.equal(newName);
            expect(await WrappedKreskoAsset.symbol()).to.equal(newSymbol);
        });

        it("sets correct state", async function () {
            expect(await WrappedKreskoAsset.name()).to.equal(name);
            expect(await WrappedKreskoAsset.symbol()).to.equal(symbol);
            expect(await WrappedKreskoAsset.asset()).to.equal(KreskoAsset.address);
            expect(await WrappedKreskoAsset.hasRole(Role.ADMIN, addr.deployer)).to.equal(true);
            expect(await WrappedKreskoAsset.hasRole(Role.OPERATOR, hre.Diamond.address)).to.equal(true);

            expect(await WrappedKreskoAsset.totalSupply()).to.equal(0);
            expect(await WrappedKreskoAsset.totalAssets()).to.equal(await KreskoAsset.totalSupply());

            const rebalance = await KreskoAsset.rebalance();
            expect(rebalance.rate).to.equal(0);
            expect(rebalance.expand).to.equal(false);
        });
    });
});