import hre from "hardhat";
import { expect } from "chai";
import { Action, } from "@test-utils";
// import { toBig } from "@utils/numbers";
import { withFixture } from "@utils/test";
// import { GnosisSafeL2 } from "types/typechain/src/contracts/vendor/gnosis/GnosisSafeL2";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";

describe.only("Council", function () {
    withFixture(["minter-test", "integration"]);
    beforeEach(async function () {
        this.collateral = this.collaterals[0];
        this.krAsset = this.krAssets[0];

        const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();
        this.deployer = deployer;
        this.devTwo = devTwo;
        this.extOne = extOne;
    });
   
    describe("#toggleAssetsPaused", () => {
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
    });
});
