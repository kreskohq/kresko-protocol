import hre, { users } from "hardhat";
import { expect } from "chai";
import { Action, } from "@test-utils";
import { toBig } from "@utils/numbers";
import { withFixture } from "@utils/test";
// import { GnosisSafeL2 } from "types/typechain/src/contracts/vendor/gnosis/GnosisSafeL2";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";

describe.only("Council", function () {
    withFixture(["minter-test", "integration"]);
    beforeEach(async function () {
        this.collateral = this.collaterals[0];
        this.initialBalance = toBig(100000);
        await this.collateral.mocks.contract.setVariable("_balances", {
            [users.userOne.address]: this.initialBalance,
        });
        await this.collateral.mocks.contract.setVariable("_allowances", {
            [users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });

        expect(await this.collateral.contract.balanceOf(users.userOne.address)).to.equal(this.initialBalance);

        this.depositArgs = {
            user: users.userOne,
            asset: this.collateral,
            amount: toBig(10000),
        };
    });
   
    describe("#toggleAssetsPaused", () => {
        describe("toggle all possible actions: DEPOSIT, WITHDRAW, REPAY, BORROW, LIQUIDATION", () => {
            it("can toggle action DEPOSIT pause status on and off", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.DEPOSIT, true, 0],
                    [deployer, devTwo, extOne],
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
                    [deployer, devTwo, extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.DEPOSIT.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action WITHDRAW pause status on and off", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.WITHDRAW, true, 0],
                    [deployer, devTwo, extOne],
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
                    [deployer, devTwo, extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.WITHDRAW.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action REPAY pause status on and off", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.REPAY, true, 0],
                    [deployer, devTwo, extOne],
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
                    [deployer, devTwo, extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.REPAY.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action BORROW pause status on and off", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.BORROW, true, 0],
                    [deployer, devTwo, extOne],
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
                    [deployer, devTwo, extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.BORROW.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });

            it("can toggle action LIQUIDATION pause status on and off", async function () {
                const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

                await executeContractCallWithSigners(
                    hre.Multisig,
                    hre.Diamond,
                    "toggleAssetsPaused",
                    [[this.collateral.address], Action.LIQUIDATION, true, 0],
                    [deployer, devTwo, extOne],
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
                    [deployer, devTwo, extOne],
                );

                isPaused = await hre.Diamond.assetActionPaused(
                    Action.LIQUIDATION.toString(),
                    this.collateral.address,
                );
                expect(isPaused).to.equal(false);
            });
        });
    });
});
