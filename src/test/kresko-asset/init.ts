import hre from "hardhat";
import { Error, withFixture } from "@test-utils";
import { expect } from "chai";
import minterConfig from "../../config/minter";
import roles from "../utils/roles";

const [name, symbol, underlyingSymbol] = minterConfig.krAssets.test[0];

describe("KreskoAsset", function () {
    let KreskoAsset: KreskoAsset;
    withFixture("kreskoAsset");

    describe("Underlying", () => {
        beforeEach(async function () {
            [KreskoAsset] = hre.krAssets[0];
            // Grant minting rights for test deployer
            await KreskoAsset.grantRole(roles.OPERATOR, this.addresses.deployer);
        });
        describe("#initialization", () => {
            it("cant initialize twice", async function () {
                const [KreskoAsset] = hre.krAssets[0];
                await expect(
                    KreskoAsset.initialize(name, underlyingSymbol, 18, this.addresses.deployer, hre.Diamond.address),
                ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
            });

            it("cant initialize implementation", async function () {
                const deployment = await hre.deployments.get(underlyingSymbol);
                const implementationAddress = deployment.implementation;
                const KreskoAsset = await hre.ethers.getContractAt("KreskoAsset", implementationAddress);

                await expect(
                    KreskoAsset.initialize(name, symbol, 18, this.addresses.deployer, hre.Diamond.address),
                ).to.be.revertedWith(Error.ALREADY_INITIALIZED_OZ);
            });

            it("sets correct state", async function () {
                expect(await KreskoAsset.name()).to.equal(name);
                expect(await KreskoAsset.symbol()).to.equal(underlyingSymbol);
                expect(await KreskoAsset.kresko()).to.equal(hre.Diamond.address);
                expect(await KreskoAsset.hasRole(roles.ADMIN, this.addresses.deployer)).to.equal(true);
                expect(await KreskoAsset.hasRole(roles.OPERATOR, hre.Diamond.address)).to.equal(true);

                expect(await KreskoAsset.totalSupply()).to.equal(0);
                expect(await KreskoAsset.rebalanced()).to.equal(false);

                const rebalance = await KreskoAsset.rebalance();
                expect(rebalance.rate).to.equal(0);
                expect(rebalance.expand).to.equal(false);
            });

            it("can reinizialize metadata", async function () {
                const newName = "foo";
                const newSymbol = "bar";
                await expect(KreskoAsset.updateMetaData(newName, newSymbol, 2)).to.not.be.revertedWith(
                    Error.ALREADY_INITIALIZED_OZ,
                );
                expect(await KreskoAsset.name()).to.equal(newName);
                expect(await KreskoAsset.symbol()).to.equal(newSymbol);
            });
        });

        describe("#rate numerator", () => {
            const defaultMintAmount = hre.toBig(100);
            it("can adjust rate", async function () {
                const rate = hre.toBig("1.525");
                const expand = true;
                await expect(KreskoAsset.setRebalance(rate, expand)).to.not.be.reverted;
                expect(await KreskoAsset.rebalanced()).to.equal(true);
                const rebalance = await KreskoAsset.rebalance();
                expect(rebalance.rate).equal(rate);
            });

            describe("#balance + supply", () => {
                it("has no effect with no rate", async function () {
                    const { deployer } = this.addresses;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    expect(await KreskoAsset.rebalanced()).to.equal(false);
                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount);
                });

                it("expands balance and supply with positive rate @ 2", async function () {
                    const { deployer } = this.addresses;
                    const rate = 2;
                    const expand = true;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.mul(rate));
                    expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(rate));
                });

                it("expands balance and supply with positive rate @ 3", async function () {
                    const { deployer } = this.addresses;
                    const rate = 3;
                    const expand = true;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.mul(rate));
                    expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(rate));
                });

                it("expands balance and supply with positive rate @ 100", async function () {
                    const { deployer } = this.addresses;
                    const rate = 100;
                    const expand = true;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.mul(rate));
                    expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(rate));
                });

                it("reduces balance and supply with negative rate @ 2", async function () {
                    const { deployer } = this.addresses;
                    const rate = 2;
                    const expand = false;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.div(rate));
                    expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(rate));
                });

                it("reduces balance and supply with negative rate @ 3", async function () {
                    const { deployer } = this.addresses;
                    const rate = 3;
                    const expand = false;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.div(rate));
                    expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(rate));
                });

                it("reduces balance and supply with negative rate @ 100", async function () {
                    const { deployer } = this.addresses;
                    const rate = 100;
                    const expand = false;
                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.div(rate));
                    expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(rate));
                });
            });

            describe("#transfer", () => {
                it("has default transfer behaviour after expansion", async function () {
                    const { deployer, userOne } = this.addresses;
                    const transferAmount = hre.toBig(1);

                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.mint(userOne, defaultMintAmount);

                    const rate = 2;
                    const expand = true;
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    const rebalancedDefaultMintAMount = defaultMintAmount.mul(rate);

                    await KreskoAsset.transfer(userOne, transferAmount);

                    expect(await KreskoAsset.balanceOf(userOne)).to.equal(
                        rebalancedDefaultMintAMount.add(transferAmount),
                    );
                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(
                        rebalancedDefaultMintAMount.sub(transferAmount),
                    );
                });

                it("has default transfer behaviour after reduction", async function () {
                    const { deployer, userOne } = this.addresses;
                    const transferAmount = hre.toBig(1);

                    await KreskoAsset.mint(deployer, defaultMintAmount);
                    await KreskoAsset.mint(userOne, defaultMintAmount);

                    const rate = 2;
                    const expand = false;
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    const rebalancedDefaultMintAMount = defaultMintAmount.div(rate);

                    await KreskoAsset.transfer(userOne, transferAmount);

                    expect(await KreskoAsset.balanceOf(userOne)).to.equal(
                        rebalancedDefaultMintAMount.add(transferAmount),
                    );
                    expect(await KreskoAsset.balanceOf(deployer)).to.equal(
                        rebalancedDefaultMintAMount.sub(transferAmount),
                    );
                });

                it("has default transferFrom behaviour after expansion", async function () {
                    const { deployer, userOne } = this.users;
                    const transferAmount = hre.toBig(1);

                    await KreskoAsset.mint(deployer.address, defaultMintAmount);
                    await KreskoAsset.mint(userOne.address, defaultMintAmount);

                    const rate = 2;
                    const expand = true;
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    await KreskoAsset.approve(userOne.address, transferAmount);

                    const rebalancedDefaultMintAMount = defaultMintAmount.mul(rate);

                    await KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount);

                    expect(await KreskoAsset.balanceOf(userOne.address)).to.equal(
                        rebalancedDefaultMintAMount.add(transferAmount),
                    );
                    expect(await KreskoAsset.balanceOf(deployer.address)).to.equal(
                        rebalancedDefaultMintAMount.sub(transferAmount),
                    );

                    await expect(
                        KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount),
                    ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                    expect(await KreskoAsset.allowance(deployer.address, userOne.address)).to.equal(0);
                });

                it("has default transferFrom behaviour after reduction", async function () {
                    const { deployer, userOne } = this.users;
                    const transferAmount = hre.toBig(1);

                    await KreskoAsset.mint(deployer.address, defaultMintAmount);
                    await KreskoAsset.mint(userOne.address, defaultMintAmount);

                    const rate = 2;
                    const expand = false;
                    await KreskoAsset.setRebalance(hre.toBig(rate), expand);

                    await KreskoAsset.approve(userOne.address, transferAmount);

                    const rebalancedDefaultMintAMount = defaultMintAmount.div(rate);

                    await KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount);

                    expect(await KreskoAsset.balanceOf(userOne.address)).to.equal(
                        rebalancedDefaultMintAMount.add(transferAmount),
                    );
                    expect(await KreskoAsset.balanceOf(deployer.address)).to.equal(
                        rebalancedDefaultMintAMount.sub(transferAmount),
                    );

                    await expect(
                        KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount),
                    ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                    expect(await KreskoAsset.allowance(deployer.address, userOne.address)).to.equal(0);
                });
            });
        });
    });
});
