import { toBig } from "@kreskolabs/lib/dist/numbers";
import { oneRay } from "@kreskolabs/lib/dist/numbers/wadray";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { addLiquidity, getAMMPrices, getTWAPUpdaterFor, swap } from "@utils/test/helpers/amm";
import {
    calcCompoundedInterest,
    calcExpectedStabilityRateHighPremium,
    calcExpectedStabilityRateLowPremium,
    calcExpectedStabilityRateNoPremium,
    getBlockTimestamp,
} from "@utils/test/helpers/calculations";
import { depositCollateral } from "@utils/test/helpers/collaterals";
import { mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import hre from "hardhat";
import { UniswapMath } from "types/typechain/src/contracts/test/markets";

describe("Stability Rates", function () {
    withFixture(["minter-test", "interest-rate", "uniswap"]);
    let users: Users;
    let UniMath: UniswapMath;
    let userOne: SignerWithAddress;
    let updateTWAP: () => Promise<void>;
    beforeEach(async function () {
        users = await hre.getUsers();
        userOne = users.deployer;
        this.krAsset = this.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
        this.collateral = this.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);
        [UniMath] = await hre.deploy<UniswapMath>("UniswapMath", {
            from: users.deployer.address,
            args: [hre.UniV2Factory.address, hre.UniV2Router.address],
        });

        const krAssetOraclePrice = 10;
        this.krAsset.setPrice(krAssetOraclePrice);
        const cLiq = toBig(1000);
        const kLiq = toBig(100);
        await this.collateral.setBalance(userOne, cLiq.mul(2));
        await depositCollateral({
            asset: this.collateral,
            amount: cLiq,
            user: userOne,
        });
        await mintKrAsset({ user: userOne, asset: this.krAsset, amount: kLiq });

        // 1000/100 = krAsset amm price 10
        const pair = await addLiquidity({
            user: userOne,
            router: hre.UniV2Router,
            amount0: cLiq,
            amount1: kLiq,
            token0: this.collateral,
            token1: this.krAsset,
        });
        updateTWAP = getTWAPUpdaterFor(pair.address);
        await hre.UniV2Oracle.initPair(pair.address, this.krAsset.address, 60 * 60);
        await updateTWAP();
    });
    describe("#price-rate", async () => {
        it("calculates correct price rates when amm == oracle", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);

            const ammPricesOptimal = await getAMMPrices(this.collateral, this.krAsset);
            expect(ammPricesOptimal.price1).to.be.closeTo(10, 0.05);

            const priceRate = await hre.Diamond.getPriceRate(this.krAsset.address);
            expect(priceRate).to.bignumber.equal(oneRay);
        });

        it("calculates correct price rates when amm > oracle", async function () {
            const premiumPercentage = 105; // 105% eg. 5% premium
            const expectedPriceRate = oneRay.div(100).mul(premiumPercentage);
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await this.collateral.setBalance(userOne, amountIn);

            await swap({
                amount: amountIn,
                route: [this.collateral.address, this.krAsset.address],
                router: hre.UniV2Router,
                user: userOne,
            });
            const ammPricesUpPremium = await getAMMPrices(this.collateral, this.krAsset);
            expect(ammPricesUpPremium.price1).to.be.closeTo(10.5, 0.05);

            await updateTWAP();
            const priceRate = await hre.Diamond.getPriceRate(this.krAsset.address);
            expect(priceRate).to.bignumber.closeTo(expectedPriceRate, oneRay.div(100));
        });

        it("calculates correct price rates when amm < oracle ", async function () {
            const premiumPercentage = 95; // 95% eg. 5% below oracle price
            const expectedPriceRate = oneRay.div(100).mul(premiumPercentage);
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({ user: userOne, asset: this.krAsset, amount: amountIn });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });
            const ammRates = await getAMMPrices(this.collateral, this.krAsset);
            expect(ammRates.price1).to.be.closeTo(9.5, 0.05);

            await updateTWAP();
            const priceRate = await hre.Diamond.getPriceRate(this.krAsset.address);
            expect(priceRate).to.bignumber.closeTo(expectedPriceRate, oneRay.div(100));
        });
    });
    describe("#stability-rate", async () => {
        it("calculates correct stability rates when amm == oracle", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);
            await updateTWAP();
            await hre.Diamond.updateSRates(this.krAsset.address);
            const [, sRate] = await hre.Diamond.getCalculatedSRates(this.krAsset.address);
            const priceRate = await hre.Diamond.getPriceRate(this.krAsset.address);
            expect(sRate).to.bignumber.equal(calcExpectedStabilityRateNoPremium(priceRate, defaultKrAssetArgs));
        });

        it("calculates correct stability rates when amm > oracle", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);
            const premiumPercentage = 105; // 105% eg. 5% premium
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await this.collateral.setBalance(userOne, amountIn);

            await swap({
                amount: amountIn,
                route: [this.collateral.address, this.krAsset.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateSRates(this.krAsset.address);

            const [, sRate] = await hre.Diamond.getCalculatedSRates(this.krAsset.address);
            const priceRate = await hre.Diamond.getPriceRate(this.krAsset.address);
            expect(sRate).to.bignumber.equal(calcExpectedStabilityRateHighPremium(priceRate, defaultKrAssetArgs));
        });

        it("calculates correct stability rates when amm < oracle ", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);
            const premiumPercentage = 95; // 95% eg. -5% premium
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({ user: userOne, asset: this.krAsset, amount: amountIn });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateSRates(this.krAsset.address);

            const [, sRate] = await hre.Diamond.getCalculatedSRates(this.krAsset.address);
            const priceRate = await hre.Diamond.getPriceRate(this.krAsset.address);

            expect(sRate).to.bignumber.equal(calcExpectedStabilityRateLowPremium(priceRate, defaultKrAssetArgs));
        });
    });
    describe("#rate-index", async () => {
        it("calculates correct rate index after a year when amm price > oracle", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);
            const premiumPercentage = 105; // 105% eg. 5% premium
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({ user: userOne, asset: this.krAsset, amount: amountIn });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateSRates(this.krAsset.address);

            const year = 60 * 60 * 24 * 365;
            const [, sRate] = await hre.Diamond.getCalculatedSRates(this.krAsset.address);

            const lastUpdateTimestamp = await getBlockTimestamp();
            await time.increase(year);
            const currentTimestamp = await getBlockTimestamp();

            await hre.Diamond.updateSRates(this.krAsset.address);
            const sRateIndexAfter = await hre.Diamond.getSRateIndex(this.krAsset.address);
            expect(sRateIndexAfter).to.be.bignumber.closeTo(
                calcCompoundedInterest(sRate, currentTimestamp, lastUpdateTimestamp),
                oneRay.div(1000),
            );
        });

        it("calculates correct rate index after year when amm price < oracle", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);
            const premiumPercentage = 90; // 90% eg. -10% premium
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({ user: userOne, asset: this.krAsset, amount: amountIn });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateSRates(this.krAsset.address);

            const year = 60 * 60 * 24 * 365;
            const [, sRate] = await hre.Diamond.getCalculatedSRates(this.krAsset.address);

            const lastUpdateTimestamp = await getBlockTimestamp();
            await time.increase(year);
            const currentTimestamp = await getBlockTimestamp();

            await hre.Diamond.updateSRates(this.krAsset.address);
            const sRateIndexAfter = await hre.Diamond.getSRateIndex(this.krAsset.address);
            expect(sRateIndexAfter).to.be.bignumber.closeTo(
                calcCompoundedInterest(sRate, currentTimestamp, lastUpdateTimestamp),
                oneRay.div(1000),
            );
        });

        it("calculates correct rate index after a year for amm price == oracle", async function () {
            await hre.Diamond.updateSRates(this.krAsset.address);

            await updateTWAP();
            await hre.Diamond.updateSRates(this.krAsset.address);

            const year = 60 * 60 * 24 * 365;
            const [, sRate] = await hre.Diamond.getCalculatedSRates(this.krAsset.address);

            const lastUpdateTimestamp = await getBlockTimestamp();
            await time.increase(year);
            const currentTimestamp = await getBlockTimestamp();

            await hre.Diamond.updateSRates(this.krAsset.address);
            const sRateIndexAfter = await hre.Diamond.getSRateIndex(this.krAsset.address);
            expect(sRateIndexAfter).to.be.bignumber.closeTo(
                calcCompoundedInterest(sRate, currentTimestamp, lastUpdateTimestamp),
                oneRay.div(1000),
            );
        });
    });
});
