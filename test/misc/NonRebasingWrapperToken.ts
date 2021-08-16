import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { extractEventFromTxReceipt } from "../../utils/events";
import { toFixedPoint } from "../../utils/fixed-point";
import { expectBigNumberToBeWithinTolerance } from "../../utils/test-utils";

import { RebasingToken } from "../../typechain/RebasingToken";
import { NonRebasingWrapperToken } from "../../typechain/NonRebasingWrapperToken";
import { Signers } from "../../types";
import { parseEther } from "ethers/lib/utils";
import { BigNumber } from "@ethereum-waffle/provider/node_modules/ethers";

const { deployContract } = hre.waffle;

describe("NonRebasingWrapperToken", function () {
    before(async function () {
        this.signers = {} as Signers;

        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers.admin = signers[0];
        this.userOne = signers[1];
        this.userTwo = signers[2];
    });

    beforeEach(async function () {
        const name: string = "Test Asset";
        const symbol: string = "TEST";

        const rebasingTokenArtifact: Artifact = await hre.artifacts.readArtifact("RebasingToken");
        const nonRebasingWrapperTokenArtifact: Artifact = await hre.artifacts.readArtifact("NonRebasingWrapperToken");

        this.rebasingToken = <RebasingToken>(
            await deployContract(this.signers.admin, rebasingTokenArtifact, [toFixedPoint(1)])
        );
        await this.rebasingToken.mint(this.userOne.address, parseEther("1000"));
        await this.rebasingToken.mint(this.userTwo.address, parseEther("1000"));

        this.nonRebasingWrapperToken = <NonRebasingWrapperToken>(
            await deployContract(this.signers.admin, nonRebasingWrapperTokenArtifact, [
                this.rebasingToken.address,
                name,
                symbol,
            ])
        );

        this.depositUnderlying = async (account: any, amount: BigNumber) => {
            await this.rebasingToken.connect(account).approve(this.nonRebasingWrapperToken.address, amount);
            return this.nonRebasingWrapperToken.connect(account).depositUnderlying(amount);
        };

        this.withdrawUnderlying = async (account: any, amount: BigNumber) => {
            return this.nonRebasingWrapperToken.connect(account).withdrawUnderlying(amount);
        };
    });

    describe("Deployment", function () {
        it("Initializes the contract with the correct parameters", async function () {
            expect(await this.nonRebasingWrapperToken.underlyingToken()).to.equal(this.rebasingToken.address);
        });
    });

    describe("#depositUnderlying", function () {
        describe("When the underlying token does not have a rebasing event", function () {
            it("Mints tokens at a 1:1 rate", async function () {
                const depositAmount0 = parseEther("100");
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(BigNumber.from(0));

                await this.depositUnderlying(this.userOne, depositAmount0);

                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(depositAmount0);
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    depositAmount0,
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(depositAmount0);
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    depositAmount0,
                );

                const depositAmount1 = parseEther("400");
                await this.depositUnderlying(this.userTwo, depositAmount1);

                const depositAmountSum = depositAmount0.add(depositAmount1);
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userTwo.address)).to.equal(depositAmount1);
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address)).to.equal(
                    depositAmount1,
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(depositAmountSum);
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    depositAmountSum,
                );
            });
        });

        describe("When the underlying token has a rebasing event", function () {
            it("Mints tokens at the appropriate rate", async function () {
                // For the first deposit, we expect a 1:1 rate
                const depositAmount0 = parseEther("100");
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(BigNumber.from(0));

                await this.depositUnderlying(this.userOne, depositAmount0);

                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(depositAmount0);
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    depositAmount0,
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(depositAmount0);
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    depositAmount0,
                );

                // For the second deposit, we will change the rebaseFactor to 2,
                // which will inflate the previous underlying balance of 100 to 200.
                let rebaseFactor = 2;
                await this.rebasingToken.setRebaseFactor(toFixedPoint(rebaseFactor));

                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("200"),
                );
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(depositAmount0);
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    parseEther("200"),
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(parseEther("100"));

                // If we now deposit 200 of the underlying, we should recieve the same
                // amount of non-rebasing tokens we got when previously depositing 100
                // when the rebaseFactor was 1.
                const depositAmount1 = parseEther("200");
                await this.depositUnderlying(this.userTwo, depositAmount1);

                expect(await this.nonRebasingWrapperToken.balanceOf(this.userTwo.address)).to.equal(parseEther("100"));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    parseEther("200"),
                );
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address)).to.equal(
                    depositAmount1,
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(parseEther("200"));
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("400"),
                );

                // For the third deposit, we change the rebase factor to 0.5,
                // which will deflate userOne's previous underlying balance
                rebaseFactor = 0.5;
                await this.rebasingToken.setRebaseFactor(toFixedPoint(rebaseFactor));

                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("100"),
                );
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(parseEther("100"));
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userTwo.address)).to.equal(parseEther("100"));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    parseEther("50"),
                );
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address)).to.equal(
                    parseEther("50"),
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(parseEther("200"));

                // If we now deposit 100 of the underlying, we will double the rebasingToken balance
                // of the nonRebasingWrapperToken contract, so we can expect to double the total supply
                // of the non rebasing token, giving us an additional 200
                const depositAmount2 = parseEther("100");
                await this.depositUnderlying(this.userOne, depositAmount2);

                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(parseEther("300"));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    parseEther("150"),
                );
                expect(await this.nonRebasingWrapperToken.totalSupply()).to.equal(parseEther("400"));
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("200"),
                );
            });
        });

        it("Emits the DepositedUnderlying event", async function () {
            const depositAmount = parseEther("100");
            const depositUnderlyingTx = await this.depositUnderlying(this.userOne, depositAmount);
            const events = await extractEventFromTxReceipt(depositUnderlyingTx, "DepositedUnderlying");
            expect(events).to.not.be.undefined;
            const event = events![0].args!;
            expect(event.account).to.equal(this.userOne.address);
            expect(event.underlyingDepositAmount).to.equal(depositAmount);
            // 1:1 ratio because it's the first deposit.
            expect(event.mintAmount).to.equal(depositAmount);
        });

        it("Reverts when the non-rebasing withdrawal amount is zero", async function () {
            await expect(this.depositUnderlying(this.userOne, BigNumber.from(0))).to.be.revertedWith(
                "DEPOSIT_AMOUNT_ZERO",
            );
        });

        it("Reverts when the sender's balance cannot cover the deposit amount", async function () {
            const userRebasingBalance = await this.rebasingToken.balanceOf(this.userOne.address);
            await expect(this.depositUnderlying(this.userOne, userRebasingBalance.add(1))).to.be.revertedWith(
                "ERC20: transfer amount exceeds balance",
            );
        });
    });

    describe("#withdrawUnderlying", function () {
        beforeEach(async function () {
            this.depositAmount = parseEther("100");
            const accountsToDepositFor = [this.userOne, this.userTwo];
            for (const account of accountsToDepositFor) {
                await this.rebasingToken
                    .connect(account)
                    .approve(this.nonRebasingWrapperToken.address, this.depositAmount);
                await this.nonRebasingWrapperToken.connect(account).depositUnderlying(this.depositAmount);
            }
        });

        describe("When the underlying token does not have a rebasing event", function () {
            it("Burns tokens at a 1:1 rate", async function () {
                const withdrawAmount = parseEther("50");

                // First, have userOne withdraw 50 non-rebasing tokens, which is also equal to 50 rebasing tokens.

                // Record the balances prior to withdrawal to confirm the movement of funds.
                let contractTokenBalanceBefore = await this.rebasingToken.balanceOf(
                    this.nonRebasingWrapperToken.address,
                );
                let userTokenBalanceBefore = await this.rebasingToken.balanceOf(this.userOne.address);
                // Withdraw!
                await this.withdrawUnderlying(this.userOne, withdrawAmount);
                // Confirm the underlying funds were moved.
                let contractTokenBalanceAfter = await this.rebasingToken.balanceOf(
                    this.nonRebasingWrapperToken.address,
                );
                let userTokenBalanceAfter = await this.rebasingToken.balanceOf(this.userOne.address);
                let contractTokenBalanceChange = contractTokenBalanceBefore.sub(contractTokenBalanceAfter);
                expect(contractTokenBalanceChange).to.equal(userTokenBalanceAfter.sub(userTokenBalanceBefore));
                expect(contractTokenBalanceChange).to.equal(parseEther("50"));
                // Confirm the total balance of the non-rebasing token contract makes sense.
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("150"),
                );
                // Confirm the non-rebasing token balance of userOne was decremented.
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(parseEther("50"));
                // Confirm the balanceOfUnderlying function returns the appropriate value now.
                const userOneBalanceOfUnderlying0 = await this.nonRebasingWrapperToken.balanceOfUnderlying(
                    this.userOne.address,
                );
                // Due to loss of precision, this will return a (slightly) smaller value.
                // We just care that it's as accurate as possible and will always result in
                // a lower balance, not higher.
                expectBigNumberToBeWithinTolerance(
                    userOneBalanceOfUnderlying0,
                    parseEther("50"),
                    BigNumber.from(50),
                    BigNumber.from(0),
                );

                // Second, remove the remainder of userOne's balance, which is 50.

                // Record the balances prior to withdrawal to confirm the movement of funds.
                contractTokenBalanceBefore = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceBefore = await this.rebasingToken.balanceOf(this.userOne.address);
                // Withdraw!
                await this.withdrawUnderlying(this.userOne, withdrawAmount);
                // Confirm the underlying funds were moved.
                contractTokenBalanceAfter = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceAfter = await this.rebasingToken.balanceOf(this.userOne.address);
                contractTokenBalanceChange = contractTokenBalanceBefore.sub(contractTokenBalanceAfter);
                expect(contractTokenBalanceChange).to.equal(userTokenBalanceAfter.sub(userTokenBalanceBefore));
                expect(contractTokenBalanceChange).to.equal(userOneBalanceOfUnderlying0);
                // Confirm the total balance of the non-rebasing token contract makes sense.
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("150").sub(userOneBalanceOfUnderlying0),
                );
                // Make sure userOne's non-rebasing balance (& balanceOfUnderlying) is 0.
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(BigNumber.from(0));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    BigNumber.from(0),
                );

                // Last, remove the entire balance of userTwo.

                // Record the balances prior to withdrawal to confirm the movement of funds.
                contractTokenBalanceBefore = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceBefore = await this.rebasingToken.balanceOf(this.userTwo.address);
                // Withdraw!
                await this.withdrawUnderlying(this.userTwo, this.depositAmount);
                // Confirm the underlying funds were moved.
                contractTokenBalanceAfter = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceAfter = await this.rebasingToken.balanceOf(this.userTwo.address);
                contractTokenBalanceChange = contractTokenBalanceBefore.sub(contractTokenBalanceAfter);
                expect(contractTokenBalanceChange).to.equal(userTokenBalanceAfter.sub(userTokenBalanceBefore));
                expect(contractTokenBalanceChange).to.equal(contractTokenBalanceBefore);
                // Confirm the total balance of the non-rebasing token contract makes sense.
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    BigNumber.from(0),
                );
                // Make sure userTwo's non-rebasing balance (& balanceOfUnderlying) is 0.
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userTwo.address)).to.equal(BigNumber.from(0));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address)).to.equal(
                    BigNumber.from(0),
                );
            });
        });

        describe("When the underlying token has a rebasing event", function () {
            it("Burns tokens at the appropriate rate", async function () {
                const withdrawAmount = parseEther("50");

                // Set rebasing factor to 2, inflating the rebasingToken balances by 2.
                await this.rebasingToken.setRebaseFactor(toFixedPoint(2));

                // Have userOne withdraw 50 non-rebasing tokens, which should correspond to 100 rebasing tokens
                // because of the rebase factor of 2.

                // Record the balances prior to withdrawal to confirm the movement of funds.
                let contractTokenBalanceBefore = await this.rebasingToken.balanceOf(
                    this.nonRebasingWrapperToken.address,
                );
                let userTokenBalanceBefore = await this.rebasingToken.balanceOf(this.userOne.address);
                // Withdraw!
                await this.withdrawUnderlying(this.userOne, withdrawAmount);
                // Confirm the underlying funds were moved.
                let contractTokenBalanceAfter = await this.rebasingToken.balanceOf(
                    this.nonRebasingWrapperToken.address,
                );
                let userTokenBalanceAfter = await this.rebasingToken.balanceOf(this.userOne.address);
                let contractTokenBalanceChange = contractTokenBalanceBefore.sub(contractTokenBalanceAfter);
                expect(contractTokenBalanceChange).to.equal(userTokenBalanceAfter.sub(userTokenBalanceBefore));
                expect(contractTokenBalanceChange).to.equal(parseEther("100"));
                // Confirm the rebasing balance of the non-rebasing token contract makes sense.
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("300"),
                );
                // Confirm the non-rebasing balanceOf and balanceOfUnderlying are appropriately decremented.
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(parseEther("50"));
                const userOneBalanceOfUnderlying0 = await this.nonRebasingWrapperToken.balanceOfUnderlying(
                    this.userOne.address,
                );
                // Due to loss of precision, this will return a (slightly) smaller value.
                // We just care that it's as accurate as possible and will always result in
                // a lower balance, not higher.
                expectBigNumberToBeWithinTolerance(
                    userOneBalanceOfUnderlying0,
                    parseEther("100"),
                    BigNumber.from(100),
                    BigNumber.from(0),
                );

                // Set rebasing factor to 0.5, setting the rebasingToken balances to half their original amount.
                await this.rebasingToken.setRebaseFactor(toFixedPoint(0.5));

                // Have userOne withdraw the remainder of their tokens, which is 50 non-rebasing giving
                // ~25 rebasing.

                const rebaseFactorChangeDivisor = 4; // because of the change in rebase factor: (2 / 0.5) = 4

                // Record the balances prior to withdrawal to confirm the movement of funds.
                contractTokenBalanceBefore = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceBefore = await this.rebasingToken.balanceOf(this.userOne.address);
                // Withdraw!
                await this.withdrawUnderlying(this.userOne, withdrawAmount);
                // Confirm the underlying funds were moved.
                contractTokenBalanceAfter = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceAfter = await this.rebasingToken.balanceOf(this.userOne.address);
                contractTokenBalanceChange = contractTokenBalanceBefore.sub(contractTokenBalanceAfter);
                expect(contractTokenBalanceChange).to.equal(userTokenBalanceAfter.sub(userTokenBalanceBefore));
                expect(contractTokenBalanceChange).to.equal(userOneBalanceOfUnderlying0.div(rebaseFactorChangeDivisor));
                // Confirm the rebasing balance of the non-rebasing token contract makes sense.
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    parseEther("75").sub(userOneBalanceOfUnderlying0.div(rebaseFactorChangeDivisor)),
                );
                // Make sure userOne's non-rebasing balance (& balanceOfUnderlying) is 0.
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userOne.address)).to.equal(BigNumber.from(0));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                    BigNumber.from(0),
                );

                // Have userTwo withdraw the entirety of their balance, which is 100 non-rebasing giving
                // ~50 rebasing.
                // Record the balances prior to withdrawal to confirm the movement of funds.
                contractTokenBalanceBefore = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceBefore = await this.rebasingToken.balanceOf(this.userTwo.address);
                // Withdraw!
                await this.withdrawUnderlying(this.userTwo, this.depositAmount);
                // Confirm the underlying funds were moved.
                contractTokenBalanceAfter = await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address);
                userTokenBalanceAfter = await this.rebasingToken.balanceOf(this.userTwo.address);
                contractTokenBalanceChange = contractTokenBalanceBefore.sub(contractTokenBalanceAfter);
                expect(contractTokenBalanceChange).to.equal(userTokenBalanceAfter.sub(userTokenBalanceBefore));
                expect(contractTokenBalanceChange).to.equal(contractTokenBalanceBefore);
                // Confirm the rebasing balance of the non-rebasing token contract makes sense.
                expect(await this.rebasingToken.balanceOf(this.nonRebasingWrapperToken.address)).to.equal(
                    BigNumber.from(0),
                );
                // Make sure userTwo's non-rebasing balance (& balanceOfUnderlying) is 0.
                expect(await this.nonRebasingWrapperToken.balanceOf(this.userTwo.address)).to.equal(BigNumber.from(0));
                expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address)).to.equal(
                    BigNumber.from(0),
                );
            });
        });

        it("Emits the WithdrewUnderlying event", async function () {
            const withdrawAmount = parseEther("50");
            const withdrawalUnderlyingTx = await this.withdrawUnderlying(this.userOne, withdrawAmount);
            const events = await extractEventFromTxReceipt(withdrawalUnderlyingTx, "WithdrewUnderlying");
            expect(events).to.not.be.undefined;
            const event = events![0].args!;
            expect(event.account).to.equal(this.userOne.address);
            expect(event.underlyingWithdrawAmount).to.equal(withdrawAmount);
            // 1:1 ratio because the rebaseFactor has not been touched.
            expect(event.burnAmount).to.equal(withdrawAmount);
        });

        it("Reverts when the non-rebasing withdrawal amount is zero", async function () {
            await expect(this.withdrawUnderlying(this.userOne, BigNumber.from(0))).to.be.revertedWith(
                "WITHDRAW_AMOUNT_ZERO",
            );
        });

        it("Reverts when the non-rebasing withdrawal amount exceeds the sender's balance", async function () {
            await expect(this.withdrawUnderlying(this.userOne, this.depositAmount.add(1))).to.be.revertedWith(
                "WITHDRAW_AMOUNT_TOO_HIGH",
            );
        });
    });

    describe("#getUnderlyingAmount", function () {
        it("Returns at a 1:1 rate when the underlying token has not had a rebasing event", async function () {
            const depositAmount = parseEther("100");
            await this.depositUnderlying(this.userOne, depositAmount);
            // Test an amount < the total supply.
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(parseEther("50"))).to.equal(parseEther("50"));
            // Test the full total supply.
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(depositAmount)).to.equal(depositAmount);
        });

        it("Returns the appropriate value when the underlying token has had a rebasing event", async function () {
            const depositAmount = parseEther("100");
            await this.depositUnderlying(this.userOne, depositAmount);

            // Set the rebase factor to 2
            await this.rebasingToken.setRebaseFactor(toFixedPoint(2));

            // Test an amount < the total supply.
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(parseEther("50"))).to.equal(
                parseEther("100"),
            );
            // Test the full total supply.
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(depositAmount)).to.equal(parseEther("200"));

            // Set the rebase factor to 0.5
            await this.rebasingToken.setRebaseFactor(toFixedPoint(0.5));

            // Test an amount < the total supply.
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(parseEther("50"))).to.equal(parseEther("25"));
            // Test the full total supply.
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(depositAmount)).to.equal(parseEther("50"));
        });

        it("Returns zero when the total supply is zero", async function () {
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(parseEther("100"))).to.equal(
                BigNumber.from(0),
            );
        });

        it("Returns zero when the provided non-rebasing amount is zero", async function () {
            // Deposit some to make sure the total supply > 0.
            await this.depositUnderlying(this.userOne, parseEther("100"));
            expect(await this.nonRebasingWrapperToken.getUnderlyingAmount(0)).to.equal(BigNumber.from(0));
        });

        it("Reverts when the provided non-rebasing amount exceeds the total supply", async function () {
            const depositAmount = parseEther("100");
            // Assume 1:1 rate
            await this.depositUnderlying(this.userOne, depositAmount);
            await expect(this.nonRebasingWrapperToken.getUnderlyingAmount(depositAmount.add(1))).to.be.revertedWith(
                "NON_REBASING_AMOUNT_TOO_HIGH",
            );
        });
    });

    describe("#balanceOfUnderlying", function () {
        it("Returns the full balance at a 1:1 rate when the underlying token has not had a rebasing event", async function () {
            // Have userOne deposit 100 and test it
            const depositAmount0 = parseEther("100");
            await this.depositUnderlying(this.userOne, depositAmount0);
            expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                depositAmount0,
            );

            // Have userTwo deposit 200 and test it.
            const depositAmount1 = parseEther("200");
            await this.depositUnderlying(this.userTwo, depositAmount1);
            // Allow some precision loss.
            expectBigNumberToBeWithinTolerance(
                await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address),
                depositAmount1,
                BigNumber.from(200),
                BigNumber.from(0),
            );

            // Test that userOne is unaffected, allowing some precision loss.
            // Allow some precision loss.
            expectBigNumberToBeWithinTolerance(
                await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address),
                depositAmount0,
                BigNumber.from(100),
                BigNumber.from(0),
            );
        });

        it("Returns the full balance at the appropriate rate when the underlying token has had a rebasing event", async function () {
            // Have userOne deposit 100 and test it
            const depositAmount0 = parseEther("100");
            await this.depositUnderlying(this.userOne, depositAmount0);
            expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                depositAmount0,
            );

            // Set the rebasing factor to 2.
            await this.rebasingToken.setRebaseFactor(toFixedPoint(2));

            // Confirm the underlying balance of userOne is now 2x.
            expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                depositAmount0.mul(2),
            );

            // Have userTwo deposit 200 and test it.
            const depositAmount1 = parseEther("200");
            await this.depositUnderlying(this.userTwo, depositAmount1);
            // No precision loss because the calculations are lucky!
            expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userTwo.address)).to.equal(
                depositAmount1,
            );

            // Test that userOne is unaffected. No precision loss because the calculations are lucky!
            expect(await this.nonRebasingWrapperToken.balanceOfUnderlying(this.userOne.address)).to.equal(
                depositAmount0.mul(2),
            );
        });
    });
});
