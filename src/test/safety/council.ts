import hre, { users } from "hardhat";
import { expect } from "chai";
import { Action, } from "@test-utils";
import { toBig } from "@utils/numbers";
import { withFixture } from "@utils/test";
// import { GnosisSafeL2 } from "types/typechain/src/contracts/vendor/gnosis/GnosisSafeL2";
import { executeContractCallWithSigners } from "@utils/gnosis/utils/execution";

describe.only("Council", function () {
    withFixture("minter-with-mocks");
    beforeEach(async function () {
        this.collateral = this.collaterals[0];
        console.log( this.collateral)
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
        it("can toggle different asset functionality to be paused", async function () {

            const { deployer, devTwo, extOne } = await hre.ethers.getNamedSigners();

            await executeContractCallWithSigners(
                hre.Multisig,
                hre.Diamond,
                "toggleAssetsPaused",
                [[this.collateral.address], Action.DEPOSIT, true, 0],
                [deployer, devTwo, extOne],
            );

            const isDepositPaused = await hre.Diamond.assetActionPaused(
                Action.DEPOSIT.toString(),
                this.collateral.address,
            );
            expect(isDepositPaused).to.equal(true);

            // await expect(
            //     hre.Diamond.connect(this.depositArgs.user).depositCollateral(
            //         this.depositArgs.user.address,
            //         this.collateral.contract.address,
            //         0,
            //     ),
            // ).to.be.revertedWith(Error.ZERO_DEPOSIT);
        });
    });
});
