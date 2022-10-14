import hre, { users } from "hardhat";
import { expect } from "chai";
import { Action, } from "@test-utils";
import { withFixture } from "@utils/test";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";
import { extractInternalIndexedEventFromTxReceipt } from "@utils";
import {
    SafetyStateChangeEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";
import { MinterEvent__factory } from "types";

describe.only("Council", function () {
    withFixture(["minter-test", "integration"]);
    beforeEach(async function () {
        this.collateral = this.collaterals[0];
        this.krAsset = this.krAssets[0];

        // These are the 5 signers on the SafetyCouncil multisig
        const { deployer, devTwo, extOne, extTwo, extThree } = await hre.ethers.getNamedSigners();
        this.deployer = deployer;
        this.devTwo = devTwo;
        this.extOne = extOne;
        this.extTwo = extTwo;
        this.extThree = extThree;
    });
   
    describe("#toggleAssetsPaused", () => {
        describe("multisig signature threshold", () => {
            it("multisig transacts successfully with majority of signers (3/5)", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
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
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
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
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
                    [this.deployer, this.devTwo, this.extOne, this.extTwo, this.extThree],
                );

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);
            });

            it("multisig should reject transactions signed by a minority of signers (2/5)", async function () {
                await expect(executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
                    [this.deployer, this.devTwo],
                )).to.be.revertedWith("");

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
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
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
                    [[this.krAsset.address], Action.REPAY, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.REPAY.toString(),
                    this.krAsset.address,
                );
                expect(isPaused).to.equal(true);
            });

            it("cannot toggle actions for addresses that are not listed collateral assets or krAssets", async function () {
                const randomAddr = hre.ethers.utils.computeAddress("0xb976778317b23a1285ec2d483eda6904d9319135b89f1d8eee9f6d2593e2665d");

                await expect(executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[randomAddr], Action.DEPOSIT, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                )).to.be.revertedWith("");

                const isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    randomAddr,
                );
                expect(isPaused).to.equal(false);
            });
        });

        describe("time", () => {
            it("", async function () {
                // TODO:
            });
        });

        describe("toggle all possible actions: DEPOSIT, WITHDRAW, REPAY, BORROW, LIQUIDATION", () => {
            it("can toggle action DEPOSIT pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action WITHDRAW pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.WITHDRAW, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(
                    Action.WITHDRAW.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.WITHDRAW, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.WITHDRAW.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action REPAY pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.REPAY, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(
                    Action.REPAY.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.REPAY, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.REPAY.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action BORROW pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.BORROW, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                let isPaused = await hre.Diamond.assetActionPaused(
                    Action.BORROW.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(true);

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.BORROW, false, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.BORROW.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action LIQUIDATION pause status on and off", async function () {
                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.LIQUIDATION, true, 0],
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

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.LIQUIDATION.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });
        });

        describe("event emission", () => {
            it("should emit event MinterEvent.SafetyStateChange on action changed containing action, asset, ", async function () {
                const tx = await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
                    [this.deployer, this.devTwo, this.extOne],
                );

                const event = await extractInternalIndexedEventFromTxReceipt<SafetyStateChangeEventObject>(
                    tx,
                    MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                    "SafetyStateChange",
                );
                expect(event.action).to.equal(Action.DEPOSIT);
                expect(event.asset).to.equal(this.collateral.address);
                expect(event.description.hash).to.equal(
                    hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("paused"))
                );
            });
        });
    });
});
