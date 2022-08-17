import hre, { users } from "hardhat";
import {
    withFixture,
    defaultDecimals,
    defaultOraclePrice,
    addMockCollateralAsset,
    addMockKreskoAsset,
} from "@test-utils";
import { Error } from "@utils/test/errors"
import { expect } from "chai";
import { toBig, fromBig } from "@utils/numbers";
import { toFixedPoint } from "@utils/fixed-point";

describe.only("Minter", function () {
    withFixture("createMinterUser");
    beforeEach(async function () {
        // Add mock collateral to protocol
        const collateralArgs = {
            name: "Collateral",
            price: defaultOraclePrice, // $10
            factor: 1,
            decimals: defaultDecimals,
        };
        const [Collateral] = await addMockCollateralAsset(collateralArgs);
        this.collateral = Collateral
        // Load account with collateral
        this.initialBalance = toBig(100000);
        await this.collateral.setVariable("_balances", {
            [users.userOne.address]: this.initialBalance,
        });
        await this.collateral.setVariable("_allowances", {
            [users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        expect(await this.collateral.balanceOf(users.userOne.address)).to.equal(this.initialBalance)

        // User deposits 10,000 collateral
        await expect(hre.Diamond.connect(users.userOne).depositCollateral(
            users.userOne.address,
            this.collateral.address,
            toBig(10000)
        )).not.to.be.reverted;
        
        // Add mock krAsset to protocol
        const krAssetArgs = {
            name: "KreskoAsset",
            price: 11, // $11
            factor: 1,
            supplyLimit: 10000,
        }
        const [KreskoAsset] = await addMockKreskoAsset(krAssetArgs);
        this.krAsset = KreskoAsset
    });

    describe("#krAsset", () => {
        describe("#mint", () => {
            it("should allow users to mint whitelisted Kresko assets backed by collateral", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toBig(1);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the amount minted is recorded for the user.
                const amountMinted = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMinted).to.equal(mintAmount);
                // Confirm the user's Kresko asset balance has increased
                const userBalance = await this.krAsset.balanceOf(users.userOne.address);
                expect(userBalance).to.equal(mintAmount);
                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.totalSupply();
                expect(kreskoAssetTotalSupplyAfter.eq(kreskoAssetTotalSupplyBefore.add(mintAmount)))
            });

        });

    });
});
