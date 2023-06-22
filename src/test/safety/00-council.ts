/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { getInternalEvent } from "@kreskolabs/lib";
import { Action, defaultCollateralArgs, defaultKrAssetArgs } from "@test-utils";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";
import { withFixture } from "@utils/test";
import { expect } from "chai";
import hre from "hardhat";
import { SafetyStateChangeEventObject } from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

describe("Safety Council", () => {
    withFixture(["minter-test"]);
    beforeEach(async function () {
        this.collateral = hre.collaterals.find(asset => asset.deployArgs!.name === defaultCollateralArgs.name)!;
        this.krAsset = hre.krAssets.find(asset => asset.deployArgs!.symbol === defaultKrAssetArgs.symbol)!;

        // These are the 5 signers on the SafetyCouncil multisig
        const { deployer, devTwo, extOne, extTwo, extThree } = await hre.ethers.getNamedSigners();
        this.deployer = deployer;
        this.devTwo = devTwo;
        this.extOne = extOne;
        this.extTwo = extTwo;
        this.extThree = extThree;
    });

    describe("#setSafetyStateSet", () => {
        it("correctly sets the safety state", async function () {
            const beforeSafetyState = await hre.Diamond.safetyStateSet();
            expect(beforeSafetyState).to.equal(false);

            await executeContractCallWithSigners(
                hre.Multisig,
                hre.Diamond,
                "setSafetyStateSet",
                [true],
                [this.deployer, this.devTwo, this.extOne],
            );

            const safetyState = await hre.Diamond.safetyStateSet();
            expect(safetyState).to.equal(true);
        });
    });

    describe("#toggleAssetsPaused", () => {
        describe("multisig signature threshold", () => {
            it("multisig transacts successfully with majority of signers (3/5)", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);
            });

            it("multisig transacts successfully with super-majority of signers (4/5)", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne, this.extTwo],
                );

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);
            });

            it("multisig transacts successfully with all signers (5/5)", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne, this.extTwo, this.extThree],
                );

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);
            });

            it("multisig should reject transactions signed by a minority of signers (2/5)", async function () {
                await expect(
                    executeContractCallWithSigners(
                        hre.Multisig,
                        hre.Diamond,
                        "toggleAssetsPaused",
                        [[this.collateral.address], Action.DEPOSIT, false, 0],
                        [this.deployer, this.devTwo],
                    ),
                ).to.be.revertedWith("");

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });
        });

        describe("toggle actions only for listed assets", () => {
            it("can toggle actions for listed collateral assets", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);
            });

            it("can toggle actions for listed krAssets", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.krAsset.address], Action.REPAY, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const isPaused = await hre.Diamond.assetActionPaused(Action.REPAY.toString(), this.krAsset.address);
                expect(isPaused).to.equal(true);
            });

            it("cannot toggle actions for addresses that are not listed collateral assets or krAssets", async function () {
                const randomAddr = hre.ethers.utils.computeAddress(
                    "0xb976778317b23a1285ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d",
                );

                await expect(
                    executeContractCallWithSigners(
                        hre.Multisig,
                        hre.Diamond,
                        "toggleAssetsPaused",
                        [[randomAddr], Action.DEPOSIT, false, 0],
                        [this.deployer, this.devTwo, this.extOne],
                    ),
                ).to.be.revertedWith("");

                const isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), randomAddr);
                expect(isPaused).to.equal(false);
            });
        });

        describe("duration based pausing", () => {
            it("can optionally set a timeout on a given pause command", async function () {
                const duration = 100000000;

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, duration],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const depositSafetyState = await hre.Diamond.safetyStateFor(this.collateral.address, Action.DEPOSIT);
                expect(depositSafetyState.length).to.equal(1);
                // Blocktime timestamp + duration should be equal to final timestamp
                expect(depositSafetyState[0].timestamp0.add(duration)).eq(depositSafetyState[0].timestamp1);
            });

            // TODO: should the protocol be updated to use duration based pausing, we can test it at the end of this function
            it("duration based pause functionality should expire after the duration has passed [PLACEHOLDER]", async function () {
                const duration = 100000;

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, duration],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const depositSafetyState = await hre.Diamond.safetyStateFor(this.collateral.address, Action.DEPOSIT);
                expect(depositSafetyState.length).to.equal(1);

                // Blocktime timestamp + duration should be equal to final timestamp
                expect(depositSafetyState[0].timestamp0.add(duration)).eq(depositSafetyState[0].timestamp1);

                // Confirm that the current blocktime is within the pause action's duration
                const blockNumBefore = await hre.ethers.provider.getBlockNumber();
                const blockBefore = await hre.ethers.provider.getBlock(blockNumBefore);
                const timestampBefore = blockBefore.timestamp;
                expect(Number(depositSafetyState[0].timestamp1)).to.be.greaterThan(timestampBefore);

                // Increase time by seven days
                const sevenDays = 7 * 24 * 60 * 60;
                await hre.ethers.provider.send("evm_increaseTime", [sevenDays]);
                await hre.ethers.provider.send("evm_mine", []);

                // Confirm that block time has increased as expected
                const blockNumAfter = await hre.ethers.provider.getBlockNumber();
                const blockAfter = await hre.ethers.provider.getBlock(blockNumAfter);
                const timestampAfter = blockAfter.timestamp;
                expect(blockNumAfter).to.be.equal(blockNumBefore + 1);
                expect(timestampAfter).to.be.equal(timestampBefore + sevenDays);

                // Confirm that the current blocktime is after the pause action's duration
                expect(timestampAfter).to.be.greaterThan(Number(depositSafetyState[0].timestamp1));

                // NOTE: now we can test any functionality that should have now expired
            });
        });

        describe("toggle all possible actions: DEPOSIT, WITHDRAW, REPAY, BORROW, LIQUIDATION", () => {
            it("can toggle action DEPOSIT pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), this.collateral.address);
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), this.collateral.address);
                expect(isPaused).to.equal(false);
            });

            it("can toggle action WITHDRAW pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.WITHDRAW, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(Action.WITHDRAW.toString(), this.collateral.address);
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.WITHDRAW, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(Action.WITHDRAW.toString(), this.collateral.address);
                expect(isPaused).to.equal(false);
            });

            it("can toggle action REPAY pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.REPAY, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(Action.REPAY.toString(), this.collateral.address);
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.REPAY, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(Action.REPAY.toString(), this.collateral.address);
                expect(isPaused).to.equal(false);
            });

            it("can toggle action BORROW pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.BORROW, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(Action.BORROW.toString(), this.collateral.address);
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.BORROW, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(Action.BORROW.toString(), this.collateral.address);
                expect(isPaused).to.equal(false);
            });

            it("can toggle action LIQUIDATION pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.LIQUIDATION, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(
                    Action.LIQUIDATION.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.LIQUIDATION, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(Action.LIQUIDATION.toString(), this.collateral.address);
                expect(isPaused).to.equal(false);
            });
        });

        describe("event emission", () => {
            it("should emit event MinterEvent.SafetyStateChange on action changed containing action, asset, and description", async function () {
                const tx = await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const event = await getInternalEvent<SafetyStateChangeEventObject>(
                    tx,
                    hre.Diamond,
                    "SafetyStateChange",
                );
                expect(event.action).to.equal(Action.DEPOSIT);
                expect(event.asset).to.equal(this.collateral.address);
                // @ts-ignore
                expect(event.description.hash!).to.equal(
                    hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("paused")),
                );
            });
        });
    });
});
