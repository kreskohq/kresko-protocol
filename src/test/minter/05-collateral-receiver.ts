import { getMaxWithdrawal } from "@utils/test/helpers/collaterals";
import optimized from "@utils/test/helpers/optimizations";
import { expect } from "../chai";
import { DefaultFixture, defaultFixture } from "@utils/test/fixtures";
import Role from "@utils/test/roles";

describe("CollateralReceiver - UncheckedCollateralWithdraw", () => {
    let f: DefaultFixture;
    let user: SignerWithAddress;

    beforeEach(async function () {
        f = await defaultFixture();
        [, , [user]] = f.users;
    });

    describe("#unchecked-collateral-withdrawal", () => {
        describe("#unchecked-withdraw", () => {
            it("withdraw correct amount", async function () {
                const withdrawalAmount = 42069;

                await expect(
                    f.Receiver.testWithdrawalAmount(f.Collateral.address, withdrawalAmount),
                ).to.not.be.revertedWith("wront amount received");
                expect(await f.Collateral.balanceOf(f.Receiver.address)).to.equal(withdrawalAmount);
            });
            it("should send correct values to the callback", async function () {
                const Receiver = f.Receiver;

                const balKreskoBefore = await f.Collateral.contract.balanceOf(hre.Diamond.address);

                await Receiver.test(f.Collateral.address, 1);
                expect(await Receiver.collateralAsset()).to.equal(f.Collateral.address);
                expect(await Receiver.account()).to.equal(user.address);
                expect((await Receiver.userData()).val).to.equal(1);

                expect(await Receiver.withdrawalAmountRequested()).to.equal(1);
                expect(await Receiver.withdrawalAmountReceived()).to.equal(1);
                const balKreskoAfter = await f.Collateral.contract.balanceOf(hre.Diamond.address);

                expect(balKreskoBefore.sub(balKreskoAfter)).to.equal(1);
                expect(await f.Collateral.contract.balanceOf(Receiver.address)).to.equal(1);
            });
            it("should be able to withdraw collateral up to MRC without returning it", async function () {
                const Receiver = f.Receiver;

                const { maxWithdrawAmount } = await getMaxWithdrawal(user.address, f.Collateral);
                expect(maxWithdrawAmount.gt(0)).to.be.true;
                await Receiver.test(f.Collateral.address, maxWithdrawAmount);

                expect((await Receiver.userData()).val).to.equal(maxWithdrawAmount);
                expect(await Receiver.withdrawalAmountRequested()).to.equal(maxWithdrawAmount);
                expect(await Receiver.withdrawalAmountReceived()).to.equal(maxWithdrawAmount);
                expect(await f.Collateral.contract.balanceOf(Receiver.address)).to.equal(maxWithdrawAmount);
                expect(await hre.Diamond.getAccountCollateralRatio(user.address)).to.be.closeTo(
                    (15e17).toString(),
                    (1e10).toString(),
                );
                await expect(Receiver.test(f.Collateral.address, (10e15).toString())).to.be.reverted;
            });

            it("should be able to withdraw full collateral and return it", async function () {
                const Receiver = f.Receiver;

                const deposits = await optimized.getAccountCollateralAmount(user.address, f.Collateral.address);
                expect(deposits.gt(0)).to.be.true;
                const balKreskoBefore = await f.Collateral.balanceOf(hre.Diamond.address);

                await Receiver.testRedeposit(f.Collateral.address, deposits);

                expect(await Receiver.withdrawalAmountRequested()).to.equal(deposits);
                expect(await Receiver.withdrawalAmountReceived()).to.equal(deposits);
                expect(await f.Collateral.balanceOf(Receiver.address)).to.equal(0);
                const balKreskoAfter = await f.Collateral.balanceOf(hre.Diamond.address);

                expect(balKreskoBefore).to.equal(balKreskoAfter);
            });
            it("should be able to withdraw full collateral and deposit another asset in its place", async function () {
                const Receiver = f.Receiver;

                const deposits = await optimized.getAccountCollateralAmount(user.address, f.Collateral.address);

                expect(deposits.gt(0)).to.be.true;

                // set second collateral price to half of the first and balance to twice that
                f.Collateral2.setPrice(10);
                await f.Collateral2.setBalance(user, f.depositAmount);
                await f.Collateral2.contract.setVariable("_allowances", {
                    [user.address]: {
                        [hre.Diamond.address]: f.depositAmount,
                        [Receiver.address]: f.depositAmount,
                    },
                });
                await Receiver.testDepositAlternate(f.Collateral.address, deposits, f.Collateral2.address);

                const secondCollateralDeposits = await optimized.getAccountCollateralAmount(
                    user.address,
                    f.Collateral2.address,
                );
                expect(secondCollateralDeposits.eq(deposits)).to.be.true;
            });
        });
        describe("#unchecked-withdraw-reverts", () => {
            it("should revert on zero withdrawal", async function () {
                await expect(f.Receiver.test(f.Collateral.address, 0)).to.be.reverted;
                // await expect(f.Receiver.test(f.Collateral.address, 0)).to.be.revertedWith(Error.ZERO_WITHDRAW);
            });
            it("should revert with no manager role", async function () {
                await hre.Diamond.revokeRole(Role.MANAGER, f.Receiver.address);
                await expect(f.Receiver.test(f.Collateral.address, 10000)).to.be.reverted;
                // await expect(f.Receiver.test(f.Collateral.address, 10000)).to.be.revertedWith(
                //     `AccessControl: account ${f.Receiver.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                // );
            });
            it("should revert if under MCR after withdrawal", async function () {
                const { maxWithdrawAmount } = await getMaxWithdrawal(user.address, f.Collateral);
                expect(maxWithdrawAmount.gt(0)).to.be.true;

                await expect(f.Receiver.test(f.Collateral.address, maxWithdrawAmount.add((0.5e18).toString()))).to.be
                    .reverted;
            });

            it("should revert if under MCR after redeposit", async function () {
                const Receiver = f.Receiver;

                const { maxWithdrawAmount } = await getMaxWithdrawal(user.address, f.Collateral);
                expect(maxWithdrawAmount.gt(0)).to.be.true;

                await expect(
                    Receiver.testInsufficientRedeposit(
                        f.Collateral.address,
                        maxWithdrawAmount.add((0.5e18).toString()),
                    ),
                ).to.be.reverted;
            });
        });
    });
});
