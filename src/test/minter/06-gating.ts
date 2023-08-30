import { defaultCollateralArgs, withFixture, wrapContractWithSigner, Error } from "@utils/test";
import { expect } from "@test/chai";
import { toBig } from "@kreskolabs/lib";

describe("Gating", () => {
    withFixture(["minter-init"]);

    beforeEach(async function () {
        // Set Gating phase to 3
        const Diamond = wrapContractWithSigner(hre.Diamond, hre.users.deployer);
        await Diamond.updatePhase(2);

        // setup collateral for userOne and userTwo
        this.collateral = this.collaterals!.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        this.initialBalance = toBig(100000);
        await this.collateral.mocks!.contract.setVariable("_balances", {
            [hre.users.userOne.address]: this.initialBalance,
        });
        await this.collateral.mocks!.contract.setVariable("_allowances", {
            [hre.users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        await this.collateral.mocks!.contract.setVariable("_balances", {
            [hre.users.userTwo.address]: this.initialBalance,
        });
        await this.collateral.mocks!.contract.setVariable("_allowances", {
            [hre.users.userTwo.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });

        this.depositArgsOne = {
            user: hre.users.userOne,
            asset: this.collateral,
            amount: toBig(10000),
        };
        this.depositArgsTwo = {
            user: hre.users.userTwo,
            asset: this.collateral,
            amount: toBig(10000),
        };

        // Deploy nft contract
        [this.nft] = await hre.deploy("MockERC1155", {
            args: [],
            from: hre.users.deployer.address,
        });
        await Diamond.updateKreskian(this.nft.address);
    });

    it("should not allow to deposit collateral if the user doesn't have required nft's", async function () {
        await expect(
            wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
                this.depositArgsOne.user.address,
                this.collateral.address,
                this.depositArgsOne.amount,
            ),
        ).to.be.revertedWith(Error.INSUFFICIENT_NFT_BALANCE);
    });

    it("should allow to deposit collateral if the user has the required nft's", async function () {
        await this.nft.safeTransferFrom(hre.users.deployer.address, this.depositArgsOne.user.address, 0, 1, "0x00");

        // Anyone should be able to deposit collateral
        await expect(
            wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
                this.depositArgsOne.user.address,
                this.collateral.address,
                this.depositArgsOne.amount,
            ),
        ).not.to.be.reverted;
    });

    it("After all the phases anyone should be able to deposit collateral", async function () {
        // Set Gating Phase to 0
        const Diamond = wrapContractWithSigner(hre.Diamond, hre.users.deployer);
        await Diamond.updatePhase(3);

        // Anyone should be able to deposit collateral
        await expect(
            wrapContractWithSigner(hre.Diamond, this.depositArgsTwo.user).depositCollateral(
                this.depositArgsTwo.user.address,
                this.collateral.address,
                this.depositArgsTwo.amount,
            ),
        ).not.to.be.reverted;
    });
});
