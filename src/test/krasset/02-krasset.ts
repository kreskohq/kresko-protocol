import { toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { defaultMintAmount, Error, kreskoAssetFixture, Role } from "@utils/test";
import { KreskoAssetAnchor } from "types/typechain";

describe.only("KreskoAsset", () => {
    let KreskoAsset: KreskoAsset;
    let KreskoAssetAnchor: KreskoAssetAnchor;
    let WETH: any;
    beforeEach(async function () {
        // Deploy WETH
        [WETH] = await hre.deploy("WETH", {
            from: hre.addr.deployer,
        });
        // Give WETH to deployer
        await WETH.connect(hre.users.devOne).deposit({ value: toBig(100) });

        ({ KreskoAsset, KreskoAssetAnchor } = await kreskoAssetFixture(WETH.address, await WETH.decimals()));

        // Grant minting rights for test deployer
        await KreskoAsset.grantRole(Role.OPERATOR, hre.addr.deployer);
        // set Kresko Anchor token address in KreskoAsset
        await KreskoAsset.connect(hre.users.admin).setAnchorToken(KreskoAssetAnchor.address);

        // Approve WETH for KreskoAsset
        await WETH.connect(hre.users.devOne).approve(KreskoAsset.address, hre.ethers.constants.MaxUint256);
        // Set fee recipient
        await KreskoAsset.connect(hre.users.admin).setFeeRecipient(hre.addr.devTwo);
    });

    describe("#rebase", () => {
        it("can set a positive rebase", async function () {
            const denominator = toBig("1.525");
            const positive = true;
            await expect(KreskoAsset.rebase(denominator, positive, [])).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(true);
            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).equal(denominator);
            expect(rebaseInfo.positive).equal(true);
        });

        it("can set a negative rebase", async function () {
            const denominator = toBig("1.525");
            const positive = false;
            await expect(KreskoAsset.rebase(denominator, positive, [])).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(true);
            const rebaseInfo = await KreskoAsset.rebaseInfo();
            expect(rebaseInfo.denominator).equal(denominator);
            expect(rebaseInfo.positive).equal(false);
        });

        it("can be disabled by setting the denominator to 1 ether", async function () {
            const denominator = toBig(1);
            const positive = false;
            await expect(KreskoAsset.rebase(denominator, positive, [])).to.not.be.reverted;
            expect(await KreskoAsset.isRebased()).to.equal(false);
        });

        describe("#balance + supply", () => {
            it("has no effect when not enabled", async function () {
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                expect(await KreskoAsset.isRebased()).to.equal(false);
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount);
            });

            it("increases balance and supply with positive rebase @ 2", async function () {
                const denominator = 2;
                const positive = true;
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.mul(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(denominator));
            });

            it("increases balance and supply with positive rebase @ 3", async function () {
                const denominator = 3;
                const positive = true;
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.mul(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(denominator));
            });

            it("increases balance and supply with positive rebase  @ 100", async function () {
                const denominator = 100;
                const positive = true;
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.mul(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.mul(denominator));
            });

            it("reduces balance and supply with negative rebase @ 2", async function () {
                const denominator = 2;
                const positive = false;
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.div(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(denominator));
            });

            it("reduces balance and supply with negative rebase @ 3", async function () {
                const denominator = 3;
                const positive = false;
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.div(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(denominator));
            });

            it("reduces balance and supply with negative rebase @ 100", async function () {
                const denominator = 100;
                const positive = false;
                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.div(denominator));
                expect(await KreskoAsset.totalSupply()).to.equal(defaultMintAmount.div(denominator));
            });
        });

        describe("#transfer", () => {
            it("has default transfer behaviour after positive rebase", async function () {
                const transferAmount = toBig(1);

                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.mint(hre.addr.userOne, defaultMintAmount);

                const denominator = 2;
                const positive = true;
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.mul(denominator);

                await KreskoAsset.transfer(hre.addr.userOne, transferAmount);

                expect(await KreskoAsset.balanceOf(hre.addr.userOne)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );
            });

            it("has default transfer behaviour after negative rebase", async function () {
                const transferAmount = toBig(1);

                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.mint(hre.addr.userOne, defaultMintAmount);

                const denominator = 2;
                const positive = false;
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.div(denominator);

                await KreskoAsset.transfer(hre.addr.userOne, transferAmount);

                expect(await KreskoAsset.balanceOf(hre.addr.userOne)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );
            });

            it("has default transferFrom behaviour after positive rebase", async function () {
                const transferAmount = toBig(1);

                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.mint(hre.addr.userOne, defaultMintAmount);

                const denominator = 2;
                const positive = true;
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                await KreskoAsset.approve(hre.addr.userOne, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.mul(denominator);

                await KreskoAsset.connect(hre.users.userOne).transferFrom(
                    hre.addr.deployer,
                    hre.addr.userOne,
                    transferAmount,
                );

                expect(await KreskoAsset.balanceOf(hre.addr.userOne)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(hre.users.userOne).transferFrom(
                        hre.addr.deployer,
                        hre.addr.userOne,
                        transferAmount,
                    ),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(hre.addr.deployer, hre.addr.userOne)).to.equal(0);
            });

            it("has default transferFrom behaviour after positive rebase @ 100", async function () {
                const transferAmount = toBig(1);

                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.mint(hre.addr.userOne, defaultMintAmount);

                const denominator = 100;
                const positive = true;
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                await KreskoAsset.approve(hre.addr.userOne, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.mul(denominator);

                await KreskoAsset.connect(hre.users.userOne).transferFrom(
                    hre.addr.deployer,
                    hre.addr.userOne,
                    transferAmount,
                );

                expect(await KreskoAsset.balanceOf(hre.addr.userOne)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(hre.users.userOne).transferFrom(
                        hre.addr.deployer,
                        hre.addr.userOne,
                        transferAmount,
                    ),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(hre.addr.deployer, hre.addr.userOne)).to.equal(0);
            });

            it("has default transferFrom behaviour after negative rebase", async function () {
                const transferAmount = toBig(1);

                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.mint(hre.addr.userOne, defaultMintAmount);

                const denominator = 2;
                const positive = false;
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                await KreskoAsset.approve(hre.addr.userOne, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.div(denominator);

                await KreskoAsset.connect(hre.users.userOne).transferFrom(
                    hre.addr.deployer,
                    hre.addr.userOne,
                    transferAmount,
                );

                expect(await KreskoAsset.balanceOf(hre.addr.userOne)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(hre.users.userOne).transferFrom(
                        hre.addr.deployer,
                        hre.addr.userOne,
                        transferAmount,
                    ),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(hre.addr.deployer, hre.addr.userOne)).to.equal(0);
            });

            it("has default transferFrom behaviour after negative rebase @ 100", async function () {
                const transferAmount = toBig(1);

                await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
                await KreskoAsset.mint(hre.addr.userOne, defaultMintAmount);

                const denominator = 100;
                const positive = false;
                await KreskoAsset.rebase(toBig(denominator), positive, []);

                await KreskoAsset.approve(hre.addr.userOne, transferAmount);

                const rebaseInfodDefaultMintAMount = defaultMintAmount.div(denominator);

                await KreskoAsset.connect(hre.users.userOne).transferFrom(
                    hre.addr.deployer,
                    hre.addr.userOne,
                    transferAmount,
                );

                expect(await KreskoAsset.balanceOf(hre.addr.userOne)).to.equal(
                    rebaseInfodDefaultMintAMount.add(transferAmount),
                );
                expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(
                    rebaseInfodDefaultMintAMount.sub(transferAmount),
                );

                await expect(
                    KreskoAsset.connect(hre.users.userOne).transferFrom(
                        hre.addr.deployer,
                        hre.addr.userOne,
                        transferAmount,
                    ),
                ).to.be.revertedWith(Error.NOT_ENOUGH_ALLOWANCE);

                expect(await KreskoAsset.allowance(hre.addr.deployer, hre.addr.userOne)).to.equal(0);
            });
        });
    });

    describe("Deposit and Withdraw", () => {
        describe("Deposit", () => {
            it("cannot deposit when paused", async function () {
                await KreskoAsset.connect(hre.users.admin).pause();
                await expect(KreskoAsset.deposit(hre.addr.devOne, toBig(10))).to.be.revertedWith("Pausable: paused");
                await KreskoAsset.connect(hre.users.admin).unpause();
            });
            it("can deposit with token", async function () {
                await KreskoAsset.connect(hre.users.devOne).deposit(hre.addr.devOne, toBig(10));
                expect(await KreskoAsset.balanceOf(hre.addr.devOne)).to.equal(toBig(10));
            });
            it("cannot deposit native token if not enabled", async function () {
                await expect(hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10) })).to.be
                    .reverted;
            });
            it("can deposit native token if enabled", async function () {
                await KreskoAsset.connect(hre.users.admin).enableNativeToken(true);
                const prevBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
                await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10, 18) });
                const currentBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
                expect(currentBalance.sub(prevBalance)).to.equal(toBig(10));
            });
            it("transfers the correct fees to feeRecipient", async function () {
                await KreskoAsset.connect(hre.users.admin).setOpenFee(toBig(1, 17));
                await KreskoAsset.connect(hre.users.admin).enableNativeToken(true);

                let prevBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
                const prevWETHBalanceDevTwo = await WETH.balanceOf(hre.addr.devTwo);

                await KreskoAsset.connect(hre.users.devOne).deposit(hre.addr.devOne, toBig(10));

                let currentBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
                const currentWETHBalanceDevTwo = await WETH.balanceOf(hre.addr.devTwo);
                expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
                expect(currentWETHBalanceDevTwo.sub(prevWETHBalanceDevTwo)).to.equal(toBig(1));

                prevBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
                const prevBalanceDevTwo = await hre.ethers.provider.getBalance(hre.addr.devTwo);
                await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(10) });
                currentBalanceDevOne = await KreskoAsset.balanceOf(hre.addr.devOne);
                const currentBalanceDevTwo = await hre.ethers.provider.getBalance(hre.addr.devTwo);
                expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
                expect(currentBalanceDevTwo.sub(prevBalanceDevTwo)).to.equal(toBig(1));

                // Set openfee to 0
                await KreskoAsset.connect(hre.users.admin).setOpenFee(0);
            });
        });
        describe("Withdraw", () => {
            beforeEach(async function () {
                // Deposit some tokens here
                await KreskoAsset.connect(hre.users.devOne).deposit(hre.addr.devOne, toBig(10));

                await KreskoAsset.connect(hre.users.admin).enableNativeToken(true);
                await hre.users.devOne.sendTransaction({ to: KreskoAsset.address, value: toBig(100) });
            });
            it("cannot withdraw when paused", async function () {
                await KreskoAsset.connect(hre.users.admin).pause();
                await expect(KreskoAsset.withdraw(toBig(1), false)).to.be.revertedWith("Pausable: paused");
                await KreskoAsset.connect(hre.users.admin).unpause();
            });
            it("can withdraw", async function () {
                const prevBalance = await WETH.balanceOf(hre.addr.devOne);
                await KreskoAsset.connect(hre.users.devOne).withdraw(toBig(1), false);
                const currentBalance = await WETH.balanceOf(hre.addr.devOne);
                expect(currentBalance.sub(prevBalance)).to.equal(toBig(1));
            });
            it("can withdraw native token if enabled", async function () {
                await KreskoAsset.connect(hre.users.admin).enableNativeToken(true);
                const prevBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
                await KreskoAsset.connect(hre.users.devOne).withdraw(toBig(1), true);
                const currentBalance = await KreskoAsset.balanceOf(hre.addr.devOne);
                expect(prevBalance.sub(currentBalance)).to.equal(toBig(1));
            });
            it("transfers the correct fees to feeRecipient", async function () {
                // set close fee to 10%
                await KreskoAsset.connect(hre.users.admin).setCloseFee(toBig(1, 17));

                const prevBalanceDevOne = await WETH.balanceOf(hre.addr.devOne);
                let prevBalanceDevTwo = await WETH.balanceOf(hre.addr.devTwo);
                await KreskoAsset.connect(hre.users.devOne).withdraw(toBig(10), false);
                const currentBalanceDevOne = await WETH.balanceOf(hre.addr.devOne);
                let currentBalanceDevTwo = await WETH.balanceOf(hre.addr.devTwo);
                expect(currentBalanceDevOne.sub(prevBalanceDevOne)).to.equal(toBig(9));
                expect(currentBalanceDevTwo.sub(prevBalanceDevTwo)).to.equal(toBig(1));

                // Withdraw native token and check if fee is transferred
                prevBalanceDevTwo = await hre.ethers.provider.getBalance(hre.addr.devTwo);
                await KreskoAsset.connect(hre.users.devOne).withdraw(toBig(10), true);
                currentBalanceDevTwo = await hre.ethers.provider.getBalance(hre.addr.devTwo);
                expect(currentBalanceDevTwo.sub(prevBalanceDevTwo)).to.equal(toBig(1));
            });
        });
    });
});
