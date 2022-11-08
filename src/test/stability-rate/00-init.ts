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
            const config = await hre.Diamond.getStabilityRateConfigurationForAsset(this.krAsset.address);

            // default values
            expect(config.debtIndex).to.bignumber.equal(oneRay);
            expect(config.stabilityRate).to.bignumber.equal(oneRay);
            expect(config.asset).to.equal(this.krAsset.address);

            // configured values
            expect(config.rateSlope1).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.rateSlope1);
            expect(config.rateSlope2).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.rateSlope2);
            expect(config.stabilityRateBase).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.stabilityRateBase);
            expect(config.optimalPriceRate).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.optimalPriceRate);
            expect(config.priceRateDelta).to.bignumber.equal(defaultKrAssetArgs.stabilityRates.priceRateDelta);
        });

        it("configures correct stability rates", async function () {
            const configuration: StabilityRateFacet.StabilityRateSetupStruct = {
                stabilityRateBase: oneRay,
                rateSlope1: oneRay.mul(10),
                rateSlope2: oneRay.mul(50),
                optimalPriceRate: oneRay.div(2),
                priceRateDelta: oneRay.div(100).mul(10),
            };

            await hre.Diamond.configureStabilityRatesForAsset(this.krAsset.address, configuration);

            const config = await hre.Diamond.getStabilityRateConfigurationForAsset(this.krAsset.address);

            // default values
            expect(config.debtIndex).to.bignumber.equal(oneRay);
            expect(config.stabilityRate).to.bignumber.equal(oneRay);
            expect(config.asset).to.equal(this.krAsset.address);

            // configured values
            expect(config.rateSlope1).to.bignumber.equal(configuration.rateSlope1);
            expect(config.rateSlope2).to.bignumber.equal(configuration.rateSlope2);
            expect(config.stabilityRateBase).to.bignumber.equal(configuration.stabilityRateBase);
            expect(config.optimalPriceRate).to.bignumber.equal(configuration.optimalPriceRate);
            expect(config.priceRateDelta).to.bignumber.equal(configuration.priceRateDelta);
        });
        it("cant set incorrect values", async function () {
            const incorrectOptimalRate: StabilityRateFacet.StabilityRateSetupStruct = {
                stabilityRateBase: oneRay,
                rateSlope1: oneRay.mul(10),
                rateSlope2: oneRay.mul(50),
                optimalPriceRate: oneRay.add(1),
                priceRateDelta: oneRay.div(100).mul(10),
            };
            const incorrectExcessRate: StabilityRateFacet.StabilityRateSetupStruct = {
                stabilityRateBase: oneRay,
                rateSlope1: oneRay.mul(10),
                rateSlope2: oneRay.mul(50),
                optimalPriceRate: oneRay,
                priceRateDelta: oneRay.add(1),
            };
            await expect(
                hre.Diamond.initializeStabilityRateForAsset(this.krAsset.address, defaultKrAssetArgs.stabilityRates),
            ).to.be.reverted;
            await expect(hre.Diamond.configureStabilityRatesForAsset(this.krAsset.address, incorrectOptimalRate)).to.be
                .reverted;
            await expect(hre.Diamond.configureStabilityRatesForAsset(this.krAsset.address, incorrectExcessRate)).to.be
                .reverted;
        });
    });
});