import hre from "hardhat";
import { expect } from "@test/chai";
import { withFixture, Error, defaultMintAmount, Role } from "@utils/test";

describe("KreskoAsset", function () {
    let KreskoAsset: KreskoAsset;
    withFixture(["minter-test", "kr"]);
    beforeEach(async function () {
        KreskoAsset = hre.krAssets[0].contract;
        // Grant minting rights for test deployer
        await KreskoAsset.grantRole(Role.OPERATOR, hre.addr.deployer);
    });
    describe("#rebase", () => {
        it("can set a expanding denominator", async function () {
            const denominator = hre.toBig("1.525");
            const expand = true;
            await expect(KreskoAsset.rebase(denominator, expand)).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(true);
            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).equal(denominator);
            expect(rebaseInfo.expand).equal(true);
        });

        it("can set a reducing denominator", async function () {
            const denominator = hre.toBig("1.525");
            const expand = false;
            await expect(KreskoAsset.rebase(denominator, expand)).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(true);
            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).equal(denominator);
            expect(rebaseInfo.expand).equal(false);
        });

        it("can be disabled by setting the denominator to 1 ether", async function () {
            const denominator = hre.toBig(1);
            const expand = false;
            await expect(KreskoAsset.rebase(denominator, expand)).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(false);
        });

        it("can be disabled by setting the denominator to 0", async function () {
            const denominator = 0;
            const expand = true;
            await expect(KreskoAsset.rebase(denominator, expand)).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(false);
        });

        describe("#balance + supply", () => {
            it("has no effect when not enabled", async function () {
                const { deployer } = hre.addr;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                expect(await KreskoAsset.isRebased()).to.equal(false);
                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount);
            });

            it("expands balance and supply with positive denominator @ 2", async function () {
                const { deployer } = hre.addr;
                const denominator = 2;
                const expand = true;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.mul(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(denominator));
            });

            it("expands balance and supply with positive denominator @ 3", async function () {
                const { deployer } = hre.addr;
                const denominator = 3;
                const expand = true;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.mul(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(denominator));
            });

            it("expands balance and supply with positive denominator @ 100", async function () {
                const { deployer } = hre.addr;
                const denominator = 100;
                const expand = true;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.mul(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(denominator));
            });

            it("reduces balance and supply with negative denominator @ 2", async function () {
                const { deployer } = hre.addr;
                const denominator = 2;
                const expand = false;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.div(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(denominator));
            });

            it("reduces balance and supply with negative denominator @ 3", async function () {
                const { deployer } = hre.addr;
                const denominator = 3;
                const expand = false;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.div(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(denominator));
            });

            it("reduces balance and supply with negative denominator @ 100", async function () {
                const { deployer } = hre.addr;
                const denominator = 100;
                const expand = false;
                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                expect(await KreskoAsset.balanceOf(deployer)).to.equal(defaultMintAmount.div(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(denominator));
            });
        });

        describe("#transfer", () => {
            it("has default transfer behaviour after expansion", async function () {
                const { deployer, userOne } = hre.addr;
                const transferAmount = hre.toBig(1);

                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.mint(userOne, defaultMintAmount);

                const denominator = 2;
                const expand = true;
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.mul(denominator);

                await KreskoAsset.transfer(userOne, transferAmount);

                expect(await KreskoAsset.balanceOf(userOne)).to.equal(rebaseInfodDefaultMintAMount.add(transferAmount));
                expect(await KreskoAsset.balanceOf(deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );
            });

            it("has default transfer behaviour after reduction", async function () {
                const { deployer, userOne } = hre.addr;
                const transferAmount = hre.toBig(1);

                await KreskoAsset.mint(deployer, defaultMintAmount);
                await KreskoAsset.mint(userOne, defaultMintAmount);

                const denominator = 2;
                const expand = false;
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.div(denominator);

                await KreskoAsset.transfer(userOne, transferAmount);

                expect(await KreskoAsset.balanceOf(userOne)).to.equal(rebaseInfodDefaultMintAMount.add(transferAmount));
                expect(await KreskoAsset.balanceOf(deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );
            });

            it("has default transferFrom behaviour after expansion", async function () {
                const { deployer, userOne } = hre.users;
                const transferAmount = hre.toBig(1);

                await KreskoAsset.mint(deployer.address, defaultMintAmount);
                await KreskoAsset.mint(userOne.address, defaultMintAmount);

                const denominator = 2;
                const expand = true;
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                await KreskoAsset.approve(userOne.address, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.mul(denominator);

                await KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount);

                expect(await KreskoAsset.balanceOf(userOne.address)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(deployer.address)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(deployer.address, userOne.address)).to.equal(0);
            });

            it("has default transferFrom behaviour after expansion @ denominator 100", async function () {
                const { deployer, userOne } = hre.users;
                const transferAmount = hre.toBig(1);

                await KreskoAsset.mint(deployer.address, defaultMintAmount);
                await KreskoAsset.mint(userOne.address, defaultMintAmount);

                const denominator = 100;
                const expand = true;
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                await KreskoAsset.approve(userOne.address, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.mul(denominator);

                await KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount);

                expect(await KreskoAsset.balanceOf(userOne.address)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(deployer.address)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(deployer.address, userOne.address)).to.equal(0);
            });

            it("has default transferFrom behaviour after reduction", async function () {
                const { deployer, userOne } = hre.users;
                const transferAmount = hre.toBig(1);

                await KreskoAsset.mint(deployer.address, defaultMintAmount);
                await KreskoAsset.mint(userOne.address, defaultMintAmount);

                const denominator = 2;
                const expand = false;
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                await KreskoAsset.approve(userOne.address, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.div(denominator);

                await KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount);

                expect(await KreskoAsset.balanceOf(userOne.address)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(deployer.address)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(deployer.address, userOne.address)).to.equal(0);
            });

            it("has default transferFrom behaviour after reduction @ 100", async function () {
                const { deployer, userOne } = hre.users;
                const transferAmount = hre.toBig(1);

                await KreskoAsset.mint(deployer.address, defaultMintAmount);
                await KreskoAsset.mint(userOne.address, defaultMintAmount);

                const denominator = 100;
                const expand = false;
                await KreskoAsset.rebase(hre.toBig(denominator), expand);

                await KreskoAsset.approve(userOne.address, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.div(denominator);

                await KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount);

                expect(await KreskoAsset.balanceOf(userOne.address)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(deployer.address)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(userOne).transferFrom(deployer.address, userOne.address, transferAmount),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(deployer.address, userOne.address)).to.equal(0);
            });
        });
    });
});