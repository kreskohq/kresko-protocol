import { smock } from "@defi-wonderland/smock";
import { fromBig, toBig } from "@kreskolabs/lib";
import { Error, Role, defaultCollateralArgs, withFixture, wrapContractWithSigner } from "@test-utils";
import { addMockCollateralAsset, getMaxWithdrawal } from "@utils/test/helpers/collaterals";
import { expect } from "../chai";
import hre from "hardhat";
import { Kresko, SmockCollateralReceiver__factory } from "types/typechain";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";

const getReceiver = async (kresko: Kresko, grantRole = true) => {
    const Receiver = await (
        await smock.mock<SmockCollateralReceiver__factory>("SmockCollateralReceiver")
    ).deploy(kresko.address);
    if (grantRole) {
        await kresko.grantRole(Role.MANAGER, Receiver.address);
    }
    return Receiver;
};

describe("CollateralReceiver - UncheckedCollateralWithdraw", () => {
    withFixture(["minter-test", "unchecked-collateral"]);

    beforeEach(async function () {
        this.secondCollateral = await addMockCollateralAsset({
            name: "Collateral",
            price: 1,
            factor: 1,
            decimals: 18,
        });
        this.collateral = this.collaterals!.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        const krAssetArgs = {
            name: "krasset2",
            symbol: "krasset2",
            price: 10, // $10
            marketOpen: true,
            factor: 1,
            supplyLimit: 100000,
            closeFee: 0,
            openFee: 0,
        };
        this.krAsset = await addMockKreskoAsset(krAssetArgs);
        this.initialBalance = toBig(1000000);

        await this.collateral.mocks!.contract.setVariable("_balances", {
            [hre.users.userFive.address]: this.initialBalance,
        });
        await this.collateral.mocks!.contract.setVariable("_allowances", {
            [hre.users.userFive.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        expect(await this.collateral.contract.balanceOf(hre.users.userFive.address)).to.equal(this.initialBalance);

        this.depositArgs = {
            user: hre.users.userFive,
            asset: this.collateral,
            amount: toBig(100000),
        };
        this.mintArgs = {
            user: hre.users.userFive,
            asset: this.krAsset,
            amount: toBig(2000),
        };
        await wrapContractWithSigner(hre.Diamond, hre.users.userFive).depositCollateral(
            hre.users.userFive.address,
            this.depositArgs.asset.address,
            this.depositArgs.amount,
        );

        await wrapContractWithSigner(hre.Diamond, hre.users.userFive).mintKreskoAsset(
            hre.users.userFive.address,
            this.mintArgs.asset.address,
            this.mintArgs.amount,
        );
    });

    describe("#unchecked-collateral-withdrawal", () => {
        describe("#unchecked-withdraw", () => {
            it("should withdraw correct amount", async function () {
                const withdrawalAmount = 42069;

                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);
                await expect(
                    Receiver.testWithdrawalAmount(this.collateral.address, withdrawalAmount),
                ).to.not.be.revertedWith("wront amount received");
                expect(await this.collateral.contract.balanceOf(Receiver.address)).to.equal(withdrawalAmount);
            });
            it("should send correct values to the callback", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);

                const balKreskoBefore = await this.collateral.contract.balanceOf(hre.Diamond.address);

                await Receiver.test(this.collateral.address, 1);
                expect(await Receiver.collateralAsset()).to.equal(this.collateral.address);
                expect(await Receiver.account()).to.equal(hre.users.userFive.address);
                expect((await Receiver.userData()).val).to.equal(1);

                expect(await Receiver.withdrawalAmountRequested()).to.equal(1);
                expect(await Receiver.withdrawalAmountReceived()).to.equal(1);
                const balKreskoAfter = await this.collateral.contract.balanceOf(hre.Diamond.address);

                expect(balKreskoBefore.sub(balKreskoAfter)).to.equal(1);
                expect(await this.collateral.contract.balanceOf(Receiver.address)).to.equal(1);
            });
            it("should be able to withdraw collateral up to MRC without returning it", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);

                const { maxWithdrawAmount } = await getMaxWithdrawal(hre.users.userFive.address, this.collateral);
                expect(maxWithdrawAmount.gt(0)).to.be.true;
                await Receiver.test(this.collateral.address, maxWithdrawAmount);

                expect((await Receiver.userData()).val).to.equal(maxWithdrawAmount);
                expect(await Receiver.withdrawalAmountRequested()).to.equal(maxWithdrawAmount);
                expect(await Receiver.withdrawalAmountReceived()).to.equal(maxWithdrawAmount);
                expect(await this.collateral.contract.balanceOf(Receiver.address)).to.equal(maxWithdrawAmount);
                expect(await hre.Diamond.getAccountCollateralRatio(hre.users.userFive.address)).to.be.closeTo(
                    (15e17).toString(),
                    (1e10).toString(),
                );
                await expect(Receiver.test(this.collateral.address, (10e15).toString())).to.be.reverted;
            });

            it("should be able to withdraw full collateral and return it", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);

                const deposits = await hre.Diamond.getAccountCollateralAmount(
                    hre.users.userFive.address,
                    this.collateral.address,
                );
                expect(deposits.gt(0)).to.be.true;
                const balKreskoBefore = await this.collateral.contract.balanceOf(hre.Diamond.address);

                await Receiver.testRedeposit(this.collateral.address, deposits);

                expect(await Receiver.withdrawalAmountRequested()).to.equal(deposits);
                expect(await Receiver.withdrawalAmountReceived()).to.equal(deposits);
                expect(await this.collateral.contract.balanceOf(Receiver.address)).to.equal(0);
                const balKreskoAfter = await this.collateral.contract.balanceOf(hre.Diamond.address);

                expect(balKreskoBefore).to.equal(balKreskoAfter);
            });
            it("should be able to withdraw full collateral and deposit another asset in its place", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);

                const deposits = await hre.Diamond.getAccountCollateralAmount(
                    hre.users.userFive.address,
                    this.collateral.address,
                );

                expect(deposits.gt(0)).to.be.true;

                // set second collateral price to half of the first and balance to twice that
                await this.secondCollateral.setPrice(fromBig(await this.collateral.getPrice(), 8));

                await this.secondCollateral.mocks!.contract.setVariable("_balances", {
                    [hre.users.userFive.address]: this.initialBalance,
                });

                await this.secondCollateral.mocks!.contract.setVariable("_allowances", {
                    [hre.users.userFive.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                        [Receiver.address]: this.initialBalance,
                    },
                });
                await Receiver.testDepositAlternate(this.collateral.address, deposits, this.secondCollateral.address);

                const secondCollateralDeposits = await hre.Diamond.getAccountCollateralAmount(
                    hre.users.userFive.address,
                    this.secondCollateral.address,
                );
                expect(secondCollateralDeposits.eq(deposits)).to.be.true;
            });
        });
        describe("#unchecked-withdraw-reverts", () => {
            it("should revert on zero withdrawal", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);
                await expect(Receiver.test(this.collateral.address, 0)).to.be.revertedWith(Error.ZERO_WITHDRAW);
            });
            it("should revert with no manager role", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond, false), hre.users.userFive);
                await expect(Receiver.test(this.collateral.address, 1)).to.be.revertedWith(
                    `AccessControl: account ${Receiver.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                );
            });
            it("should revert if under MCR after withdrawal", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);

                const { maxWithdrawAmount } = await getMaxWithdrawal(hre.users.userFive.address, this.collateral);
                expect(maxWithdrawAmount.gt(0)).to.be.true;

                await expect(Receiver.test(this.collateral.address, maxWithdrawAmount.add((0.5e18).toString()))).to.be
                    .reverted;
            });

            it("should revert if under MCR after redeposit", async function () {
                const Receiver = wrapContractWithSigner(await getReceiver(hre.Diamond), hre.users.userFive);

                const { maxWithdrawAmount } = await getMaxWithdrawal(hre.users.userFive.address, this.collateral);
                expect(maxWithdrawAmount.gt(0)).to.be.true;

                await expect(
                    Receiver.testInsufficientRedeposit(
                        this.collateral.address,
                        maxWithdrawAmount.add((0.5e18).toString()),
                    ),
                ).to.be.reverted;
            });
        });
    });
});
