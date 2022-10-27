import { expect } from "@test/chai";
import { defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { oneRay } from "@kreskolabs/lib/dist/numbers/wadray";
import { StabilityRateFacet } from "types/typechain/src/contracts/minter/facets/StabilityRateFacet";
import hre from "hardhat";

describe("Interest Rates", function () {
    withFixture(["minter-test", "interest-rate"]);
    beforeEach(async function () {
        this.krAsset = this.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
        this.collateral = this.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);
    });
    describe("#init", async () => {
        it("initializes correct stability rates", async function () {
            const config = await hre.Diamond.getSRateAssetConfiguration(this.krAsset.address);

            // default values
            expect(config.liquidityIndex).to.bignumber.equal(oneRay);
            expect(config.debtIndex).to.bignumber.equal(oneRay);
            expect(config.debtRate).to.bignumber.equal(oneRay);
            expect(config.liquidityRate).to.bignumber.equal(oneRay);
            expect(config.asset).to.equal(this.krAsset.address);

            // configured values
            expect(config.rateSlope1).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.rateSlope1);
            expect(config.rateSlope2).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.rateSlope2);
            expect(config.debtRateBase).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.debtRateBase);
            expect(config.optimalPriceRate).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.optimalPriceRate);
            expect(config.excessPriceRateDelta).to.bignumber.equal(
                defaultKrAssetArgs.stabilityRates.excessPriceRateDelta,
            );
        });

        it("configures correct stability rates", async function () {
            const configuration: StabilityRateFacet.SRateConfigStruct = {
                debtRateBase: oneRay,
                rateSlope1: oneRay.mul(10),
                rateSlope2: oneRay.mul(50),
                optimalPriceRate: oneRay.div(2),
                excessPriceRateDelta: oneRay.div(100).mul(10),
                reserveFactor: "10000",
            };

            await hre.Diamond.configureSRateAsset(this.krAsset.address, configuration);

            const config = await hre.Diamond.getSRateAssetConfiguration(this.krAsset.address);

            // default values
            expect(config.liquidityIndex).to.bignumber.equal(oneRay);
            expect(config.debtIndex).to.bignumber.equal(oneRay);
            expect(config.debtRate).to.bignumber.equal(oneRay);
            expect(config.liquidityRate).to.bignumber.equal(oneRay);
            expect(config.asset).to.equal(this.krAsset.address);

            // configured values
            expect(config.rateSlope1).to.bignumber.equal(configuration.rateSlope1);
            expect(config.rateSlope2).to.bignumber.equal(configuration.rateSlope2);
            expect(config.debtRateBase).to.bignumber.equal(configuration.debtRateBase);
            expect(config.optimalPriceRate).to.bignumber.equal(configuration.optimalPriceRate);
            expect(config.excessPriceRateDelta).to.bignumber.equal(configuration.excessPriceRateDelta);
        });
        it("cant set incorrect values", async function () {
            const incorrectOptimalRate: StabilityRateFacet.SRateConfigStruct = {
                debtRateBase: oneRay,
                rateSlope1: oneRay.mul(10),
                rateSlope2: oneRay.mul(50),
                optimalPriceRate: oneRay.add(1),
                excessPriceRateDelta: oneRay.div(100).mul(10),
                reserveFactor: "10000",
            };
            const incorrectExcessRate: StabilityRateFacet.SRateConfigStruct = {
                debtRateBase: oneRay,
                rateSlope1: oneRay.mul(10),
                rateSlope2: oneRay.mul(50),
                optimalPriceRate: oneRay,
                excessPriceRateDelta: oneRay.add(1),
                reserveFactor: "10000",
            };
            await expect(hre.Diamond.initSRateAsset(this.krAsset.address, defaultKrAssetArgs.stabilityRates)).to.be
                .reverted;
            await expect(hre.Diamond.configureSRateAsset(this.krAsset.address, incorrectOptimalRate)).to.be.reverted;
            await expect(hre.Diamond.configureSRateAsset(this.krAsset.address, incorrectExcessRate)).to.be.reverted;
        });
    });
});
