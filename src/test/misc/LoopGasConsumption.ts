import hre from "hardhat";
import {
    addNewKreskoAssetWithOraclePrice,
    TOTAL_SUPPLY_LIMIT_ONE_MILLION,
    BURN_FEE,
    CLOSE_FACTOR,
    deployAndWhitelistCollateralAsset,
    FEE_RECIPIENT_ADDRESS,
    LIQUIDATION_INCENTIVE,
    MINIMUM_COLLATERALIZATION_RATIO,
    parseEther,
    formatUnits,
} from "@utils";

import { expect } from "chai";
import * as readline from "readline";

function log(msg: string) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    let text = `${msg}`;
    process.stdout.write(text);
}
const gasLimit = 12000000;

describe.skip(`loops and gas consumption - gasLimit: ${gasLimit}`, function () {
    this.timeout(20000000000000000);
    before(async function () {
        const signers = await hre.ethers.getSigners();
        this.signers = {
            admin: signers[0],
            userOne: signers[1],
            userTwo: signers[2],
        };
        // We intentionally allow constructor that calls the initializer
        // modifier and explicitly allow this in calls to `deployProxy`.
        // The upgrades library will still print warnings, so to avoid clutter
        // we just silence those here.
        hre.upgrades.silenceWarnings();
    });

    beforeEach(async function () {
        await hre.network.provider.request({
            method: "evm_setBlockGasLimit",
            params: [hre.ethers.utils.hexlify(gasLimit)],
        });
        const kreskoFactory = await hre.ethers.getContractFactory("Kresko");
        this.kresko = <Kresko>await (
            await hre.upgrades.deployProxy(
                kreskoFactory,
                [BURN_FEE, CLOSE_FACTOR, FEE_RECIPIENT_ADDRESS, LIQUIDATION_INCENTIVE, MINIMUM_COLLATERALIZATION_RATIO],
                {
                    unsafeAllow: [
                        "constructor", // Intentionally preventing others from initializing.
                    ],
                },
            )
        ).deployed();
    });

    it("whitelistCollateral-depositCollateral-partialCollateralWithdraw 500 runs", async function () {
        console.log("\x1b[36m", "whitelistCollateral-depositCollateral-partialCollateralWithdraw 500 runs", "\x1b[0m");

        const depositValue = parseEther("10");
        const withdrawValue = parseEther("2");
        const userOneKresko: Kresko = this.kresko.connect(this.signers.userOne);
        let targetRound = 500;
        let round = 0;
        let lastTxCost = 0;
        for (round; round < targetRound; round++) {
            const { collateralAsset } = await deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 12, true, false);

            await collateralAsset.setBalanceOf(this.signers.userOne.address, depositValue);
            await userOneKresko.depositCollateral(this.signers.userOne.address, collateralAsset.address, depositValue);

            const withdrawTx = await userOneKresko.withdrawCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                withdrawValue,
                round,
            );
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsedByWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));
            expect(gasUsedByWithdraw).to.be.lessThan(gasLimit);
            log(
                `Round: ${
                    round + 1
                }/${targetRound} | withdrawCollateral gasPerTx: ${gasUsedByWithdraw} - increase per round ${
                    gasUsedByWithdraw - lastTxCost
                }${round >= targetRound - 1 ? "\n" : ""}`,
            );
            lastTxCost = gasUsedByWithdraw;
        }
        expect(round).to.equal(targetRound);
    });

    it("whitelistCollateral-addNewkrAssetWithOracle-depositCollateral-mintkrAsset-withdrawPartialCollateral 250 runs", async function () {
        console.log(
            "\x1b[36m",
            "whitelistCollateral-addNewkrAssetWithOracle-depositCollateral-mintkrAsset-withdrawPartialCollateral 250 runs",
            "\x1b[0m",
        );
        const depositValue = parseEther("10");
        const withdrawValue = parseEther("2");
        const userOneKresko: Kresko = this.kresko.connect(this.signers.userOne);
        let targetRound = 250;
        let round = 0;
        let lastTxCostMint = 0;
        let lastTxCostWithdraw = 0;
        for (round; round < targetRound; round++) {
            const [{ collateralAsset }, kreskoAssetInfo] = await Promise.all([
                deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 12, true, false),
                addNewKreskoAssetWithOraclePrice(
                    this.kresko,
                    "krAsset",
                    round.toString(),
                    1,
                    250,
                    TOTAL_SUPPLY_LIMIT_ONE_MILLION,
                ),
            ]);

            await collateralAsset.setBalanceOf(this.signers.userOne.address, depositValue);
            const depositTx = await userOneKresko.depositCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                depositValue,
            );
            const depositReceipt = await depositTx.wait();
            const gasUsedByDeposit = Number(formatUnits(depositReceipt.gasUsed, "wei"));

            const mintKrAssetTx = await userOneKresko.mintKreskoAsset(
                this.signers.userOne.address,
                kreskoAssetInfo.kreskoAsset.address,
                100,
            );
            const mintReceipt = await mintKrAssetTx.wait();
            const gasUsedByMintKreskoAsset = Number(formatUnits(mintReceipt.gasUsed, "wei"));
            expect(gasUsedByMintKreskoAsset).to.be.lessThan(gasLimit);

            const withdrawTx = await userOneKresko.withdrawCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                withdrawValue,
                round,
            );
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsedByWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));
            expect(gasUsedByWithdraw).to.be.lessThan(gasLimit);
            log(
                "Round: " +
                    (round + 1) +
                    "/" +
                    targetRound +
                    " gasPerTx: withdrawCollateral " +
                    gasUsedByWithdraw +
                    " - increase per round: " +
                    (gasUsedByWithdraw - lastTxCostWithdraw) +
                    " | collateralDeposit " +
                    gasUsedByDeposit +
                    " | krAssetMint " +
                    gasUsedByMintKreskoAsset +
                    " - increase per round: " +
                    (gasUsedByMintKreskoAsset - lastTxCostMint) +
                    "" +
                    `${round >= targetRound - 1 ? "\n" : ""}`,
            );
            lastTxCostMint = gasUsedByMintKreskoAsset;
            lastTxCostWithdraw = gasUsedByWithdraw;
        }
        expect(round).to.equal(targetRound);
    });

    it("whitelistCollateral-depositCollateral-partialCollateralWithdraw two users 500 runs", async function () {
        console.log(
            "\x1b[36m",
            "whitelistCollateral-depositCollateral-partialCollateralWithdraw two users 500 runs",
            "\x1b[0m",
        );
        const depositValue = parseEther("10");
        const withdrawValue = parseEther("2");
        const userOneKresko: Kresko = this.kresko.connect(this.signers.userOne);
        const userTwoKresko: Kresko = this.kresko.connect(this.signers.userTwo);

        // user one
        let targetRound = 500;
        let round = 0;
        for (round; round < targetRound; round++) {
            const { collateralAsset } = await deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 12, true, false);

            await collateralAsset.setBalanceOf(this.signers.userOne.address, depositValue);
            await collateralAsset.setBalanceOf(this.signers.userTwo.address, depositValue);
            await userOneKresko.depositCollateral(this.signers.userOne.address, collateralAsset.address, depositValue);

            const withdrawTx = await userOneKresko.withdrawCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                withdrawValue,
                round,
            );
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsedByWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));
            expect(gasUsedByWithdraw).to.be.lessThan(gasLimit);
            log(
                `Round: ${round + 1} withdrawCollateral gasPerTx: ${gasUsedByWithdraw} ${
                    round >= targetRound - 1 ? "\n" : ""
                }`,
            );
        }
        expect(round).to.equal(targetRound);

        round = 0;

        const collateralDeposits = await (this.kresko as Kresko).getDepositedCollateralAssets(
            this.signers.userOne.address,
        );

        // user two
        for (round; round < targetRound; round++) {
            await userTwoKresko.depositCollateral(
                this.signers.userTwo.address,
                collateralDeposits[round],
                depositValue,
            );
            const withdrawTx = await userTwoKresko.withdrawCollateral(
                this.signers.userTwo.address,
                collateralDeposits[round],
                withdrawValue,
                round,
            );
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsedByWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));
            expect(gasUsedByWithdraw).to.be.lessThan(gasLimit);
            log(
                `Round: ${round + 1}/${targetRound} User2 withdrawCollateral gasPerTx: ${gasUsedByWithdraw} ${
                    round >= targetRound - 1 ? "\n" : ""
                }`,
            );
        }
        expect(round).to.equal(targetRound);
    });

    it("should not increase gas cost (delta 10 wei) when withdrawing whole collateral over 100 runs", async function () {
        console.log(
            "\x1b[36m",
            "should not increase gas cost (delta 10 wei) when withdrawing whole collateral over 100 runs",
            "\x1b[0m",
        );
        const depositValue = parseEther("10");
        const userOneKresko: Kresko = this.kresko.connect(this.signers.userOne);

        let targetRound = 100;
        let round = 0;
        let lastTxCost;
        for (round; round < targetRound; round++) {
            const { collateralAsset } = await deployAndWhitelistCollateralAsset(this.kresko, 0.7, 420.123, 12, true, false);

            const tx = await collateralAsset.setBalanceOf(this.signers.userOne.address, depositValue);
            await tx.wait();
            const depositTx = await userOneKresko.depositCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                depositValue,
            );
            await depositTx.wait();

            const withdrawTx = await userOneKresko.withdrawCollateral(
                this.signers.userOne.address,
                collateralAsset.address,
                depositValue,
                0,
            );
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsedByWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));
            if (lastTxCost) {
                expect(gasUsedByWithdraw).to.be.closeTo(lastTxCost, 10);
            }
            lastTxCost = gasUsedByWithdraw;
            log(
                `Round: ${round + 1}/${targetRound} withdrawCollateral gasPerTx: ${gasUsedByWithdraw} ${
                    round >= targetRound - 1 ? "\n" : ""
                }`,
            );
        }
        expect(round).to.equal(targetRound);
    });
});
