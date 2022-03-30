import hre from "hardhat";
import { expect } from "chai";

import {
    CollateralAssetInfo,
    addNewKreskoAssetWithOraclePrice,
    deployAndWhitelistCollateralAsset,
    NAME_TWO,
    setupTests,
    SYMBOL_TWO,
    MARKET_CAP_ONE_MILLION,
    toFixedPoint,
} from "@utils";

describe("Time", function () {

    beforeEach(async function () {
        const { signers, kresko } = await setupTests();
        this.signers = signers;
        this.Kresko = kresko;

        // Deploy and whitelist collateral asset
        this.initialUserCollateralBalance = 1000;
        this.collateralAssetInfos = (await Promise.all<CollateralAssetInfo>([
            deployAndWhitelistCollateralAsset(this.Kresko, 1, 150, 18),
        ])) as CollateralAssetInfo[];

        for (const collateralAssetInfo of this.collateralAssetInfos as CollateralAssetInfo[]) {
            // Give userOne a balance of 1000 for each collateral asset.
            await collateralAssetInfo.collateralAsset.setBalanceOf(
                this.signers.userOne.address,
                collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
            );

            // userOne deposits entire balance as collateral
            await this.Kresko.connect(this.signers.userOne).depositCollateral(
                this.signers.userOne.address,
                collateralAssetInfo.collateralAsset.address,
                collateralAssetInfo.fromDecimal(this.initialUserCollateralBalance),
            );
        }

        this.kreskoAssetInfo = await addNewKreskoAssetWithOraclePrice(
            this.Kresko,
            NAME_TWO,
            SYMBOL_TWO,
            1,
            1,
            MARKET_CAP_ONE_MILLION,
        ); // kFactor = 1, price = $250
    });


    it("should not allow minting of Kresko assets when price is stale", async function () {
        // Attempt initial mint with fresh price
        const kreskoAssetAddress = this.kreskoAssetInfo.kreskoAsset.address;
        const mintAmount = toFixedPoint(100);
        await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
            this.signers.userOne.address,
            kreskoAssetAddress,
            mintAmount,
        );

        // Confirm the amount minted is recorded for the user
        const amountMinted = await this.Kresko.kreskoAssetDebt(
            this.signers.userOne.address,
            kreskoAssetAddress,
        );
        expect(amountMinted).to.equal(mintAmount);

        // Update the block time to be 1 second later than allowed
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        const blockTimestamp = (await hre.ethers.provider.getBlock(blockNumber)).timestamp;
        const secsUntilStale = await this.Kresko.secondsUntilStalePrice();
        const fastForwardSeconds =  Number(secsUntilStale) + 1;
        const newTimestamp = blockTimestamp + fastForwardSeconds;
        await hre.ethers.provider.send('evm_mine', [newTimestamp]);

        // Confirm that the block time has been updated
        const secondBlockNumber = await hre.ethers.provider.getBlockNumber();
        const secondBlockTimestamp = (await hre.ethers.provider.getBlock(secondBlockNumber)).timestamp;
        expect(secondBlockTimestamp).to.equal(blockTimestamp + fastForwardSeconds);

        // Confirm that price is now stale and attempted mint reverts
        await expect(
            this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
                this.signers.userOne.address,
                kreskoAssetAddress,
                mintAmount,
            ),
        ).to.be.revertedWith("KR: stale price");

        // Confirm no additional amount was minted
        const newAmountMinted = await this.Kresko.kreskoAssetDebt(
            this.signers.userOne.address,
            kreskoAssetAddress,
        );
        expect(newAmountMinted).to.equal(amountMinted);
    });
});
