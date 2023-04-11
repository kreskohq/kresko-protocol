import { ONE_YEAR, fromBig, oneRay, toBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BASIS_POINT, ONE_PERCENT, defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { addLiquidity, getAMMPrices, getTWAPUpdaterFor, swap } from "@utils/test/helpers/amm";
import {
    calcDebtIndex,
    getBlockTimestamp,
    getExpectedStabilityRate,
    oraclePriceToWad,
    toScaledAmount,
} from "@utils/test/helpers/calculations";
import { depositCollateral } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { UniswapMath } from "types/typechain/src/contracts/test/markets";

const BPS = 0.0001;
describe("Stability Rates", () => {
    withFixture(["minter-test", "uniswap"]);

    let UniMath: UniswapMath;
    let userOne: SignerWithAddress;
    let updateTWAP: () => Promise<void>;
    beforeEach(async function () {
        userOne = hre.users.deployer;
        this.krAsset = this.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;
        this.collateral = this.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        [UniMath] = await hre.deploy("UniswapMath", {
            from: hre.users.deployer.address,
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
    describe("#no-amm-prices", () => {
        // it("calculates correct price rates when the amm liquidity does not qualify");
        it("calculates correct rates and debt when there is no amm price", async function () {
            const krAssetAmount = toBig(1);
            const krAssetNoBaseRate = await addMockKreskoAsset({
                name: "krasset2",
                symbol: "krasset2",
                marketOpen: true,
                factor: 1,
                closeFee: 0,
                openFee: 0,
                stabilityRateBase: BigNumber.from(0),
                price: 10,
                supplyLimit: 2_000,
            });
            const krAssetWithBaseRate = await addMockKreskoAsset({
                name: "krasset2",
                symbol: "krasset2",
                marketOpen: true,
                factor: 1,
                closeFee: 0,
                openFee: 0,
                stabilityRateBase: BASIS_POINT.mul(20),
                price: 10,
                supplyLimit: 2_000,
            });

            // Asset
            await mintKrAsset({
                user: userOne,
                asset: krAssetNoBaseRate,
                amount: krAssetAmount,
            });
            await mintKrAsset({
                user: userOne,
                asset: krAssetWithBaseRate,
                amount: krAssetAmount,
            });

            const lastUpdateTimestamp = await getBlockTimestamp();
            const debtIndexBefore = await hre.Diamond.getDebtIndexForAsset(krAssetWithBaseRate.address);
            await time.increase(+ONE_YEAR);

            // asset with no base rate and no amm price
            const debtIndexNoBaseRate = await hre.Diamond.getDebtIndexForAsset(krAssetNoBaseRate.address);
            const debtScaledNoBaseRate = await hre.Diamond.kreskoAssetDebt(userOne.address, krAssetNoBaseRate.address);
            const debtPrincipalNoBaseRate = await hre.Diamond.kreskoAssetDebtPrincipal(
                userOne.address,
                krAssetNoBaseRate.address,
            );
            const debtInterestNoBaseRate = await hre.Diamond.kreskoAssetDebtInterest(
                userOne.address,
                krAssetNoBaseRate.address,
            );
            expect(debtIndexNoBaseRate).to.equal(oneRay);
            expect(debtScaledNoBaseRate).to.equal(debtPrincipalNoBaseRate);
            expect(debtInterestNoBaseRate.kissAmount).to.equal(0);
            expect(debtInterestNoBaseRate.assetAmount).to.equal(0);

            // asset with base rate and no amm price
            const debtIndexWithBaseRate = await hre.Diamond.getDebtIndexForAsset(krAssetWithBaseRate.address);
            const debtScaledWithBaseRate = await hre.Diamond.kreskoAssetDebt(
                userOne.address,
                krAssetWithBaseRate.address,
            );
            const debtPrincipalWithBaseRate = await hre.Diamond.kreskoAssetDebtPrincipal(
                userOne.address,
                krAssetWithBaseRate.address,
            );
            const debtInterestWithBaseRate = await hre.Diamond.kreskoAssetDebtInterest(
                userOne.address,
                krAssetWithBaseRate.address,
            );

            const expectedScaledDebt = await toScaledAmount(debtPrincipalWithBaseRate, krAssetWithBaseRate);
            const expectedDebtIndex = await calcDebtIndex(krAssetWithBaseRate, debtIndexBefore, lastUpdateTimestamp);
            const expectedAssetInterest = debtScaledWithBaseRate.sub(debtPrincipalWithBaseRate);
            const expectedKissInterestAmount = await oraclePriceToWad(
                hre.Diamond.getKrAssetValue(krAssetWithBaseRate.address, expectedAssetInterest, true),
            );

            expect(debtIndexWithBaseRate).to.equal(expectedDebtIndex);
            expect(debtScaledWithBaseRate).to.equal(expectedScaledDebt);
            expect(debtInterestWithBaseRate.assetAmount).to.equal(expectedAssetInterest);
            expect(debtInterestWithBaseRate.kissAmount).to.equal(expectedKissInterestAmount);
        });
    });
    describe("#price-rate", () => {
        it("calculates correct price rates when amm == oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

            const ammPricesOptimal = await getAMMPrices(this.collateral, this.krAsset);
            expect(ammPricesOptimal.price0).to.be.closeTo(this.krAsset.deployArgs!.price, 0.05);

            const priceRate = await hre.Diamond.getPriceRateForAsset(this.krAsset.address);
            expect(priceRate).to.bignumber.equal(oneRay);
        });

        it("calculates correct price rates when amm > oracle", async function () {
            const premiumPercentage = 105; // 105% eg. 5% premium

            const expectedPriceRate = ONE_PERCENT.mul(premiumPercentage).mul(997).div(1000);
            const expectedPrice = this.krAsset.deployArgs!.price * (premiumPercentage / 100);

            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(1).mul(premiumPercentage).div(this.krAsset.deployArgs!.price);

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
            expect(ammPricesUpPremium.price0).to.be.closeTo(expectedPrice, 0.05);

            await updateTWAP();
            const priceRate = await hre.Diamond.getPriceRateForAsset(this.krAsset.address);
            expect(priceRate).to.bignumber.closeTo(expectedPriceRate, BASIS_POINT);
        });

        it("calculates correct price rates when amm < oracle ", async function () {
            const premiumPercentage = 95; // 95% eg. 5% below oracle price

            const expectedPriceRate = ONE_PERCENT.mul(premiumPercentage).mul(1003).div(1000);
            const expectedPrice = this.krAsset.deployArgs!.price * (premiumPercentage / 100);

            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(1).mul(premiumPercentage).div(this.krAsset.deployArgs!.price);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({
                user: userOne,
                asset: this.krAsset,
                amount: amountIn,
            });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            const ammRates = await getAMMPrices(this.collateral, this.krAsset);
            expect(ammRates.price0).to.be.closeTo(expectedPrice, 0.05);

            await updateTWAP();
            const priceRate = await hre.Diamond.getPriceRateForAsset(this.krAsset.address);
            expect(priceRate).to.bignumber.closeTo(expectedPriceRate, BASIS_POINT);
        });
    });
    describe("#stability-rate", () => {
        it("calculates correct stability rate when amm == oracle", async function () {
            await updateTWAP();
            const stabilityRate = await hre.Diamond.getStabilityRateForAsset(this.krAsset.address);
            const priceRate = await hre.Diamond.getPriceRateForAsset(this.krAsset.address);

            expect(priceRate).to.bignumber.equal(oneRay);

            expect(stabilityRate).to.bignumber.equal(
                getExpectedStabilityRate(priceRate, defaultKrAssetArgs.stabilityRates),
            );
        });

        it("calculates correct stability rate when amm > oracle", async function () {
            const premiumPercentage = 105; // 105% eg. 5% premium

            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(1).mul(premiumPercentage).div(this.krAsset.deployArgs!.price);

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
            const priceRateActual = await hre.Diamond.getPriceRateForAsset(this.krAsset.address);
            const priceRateDecimal = fromBig(priceRateActual, 27);

            const expectedPriceRateDecimal = fromBig(ONE_PERCENT.mul(premiumPercentage).mul(997).div(1000), 27);
            expect(priceRateDecimal).to.closeTo(expectedPriceRateDecimal, BPS);

            const expectedStabilityRate = getExpectedStabilityRate(priceRateActual, defaultKrAssetArgs.stabilityRates);
            const stabilityRate = await hre.Diamond.getStabilityRateForAsset(this.krAsset.address);
            expect(stabilityRate).to.bignumber.equal(expectedStabilityRate);
        });

        it("calculates correct stability rates when amm < oracle ", async function () {
            const premiumPercentage = 95; // 95% eg. -5% premium

            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(1).mul(premiumPercentage).div(this.krAsset.deployArgs!.price);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );

            await mintKrAsset({
                user: userOne,
                asset: this.krAsset,
                amount: amountIn,
            });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            const priceRateActual = await hre.Diamond.getPriceRateForAsset(this.krAsset.address);
            const priceRateDecimal = fromBig(priceRateActual, 27);

            const expectedPriceRateDecimal = fromBig(ONE_PERCENT.mul(premiumPercentage).mul(1003).div(1000), 27);
            expect(priceRateDecimal).to.closeTo(expectedPriceRateDecimal, BPS);

            const expectedStabilityRate = getExpectedStabilityRate(priceRateActual, defaultKrAssetArgs.stabilityRates);
            const stabilityRate = await hre.Diamond.getStabilityRateForAsset(this.krAsset.address);
            expect(stabilityRate).to.bignumber.equal(expectedStabilityRate);
        });
    });
    describe("#debt-index", () => {
        it("calculates correct debt index after a year when amm price > oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const premiumPercentage = 105; // 105% eg. 5% premium

            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(1).mul(premiumPercentage).div(this.krAsset.deployArgs!.price);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({
                user: userOne,
                asset: this.krAsset,
                amount: amountIn,
            });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const debtIndexBefore = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            const lastUpdateTimestamp = await getBlockTimestamp();
            await time.increase(+ONE_YEAR);

            const debtIndexAfter = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            expect(debtIndexAfter).to.not.equal(debtIndexBefore);
            expect(debtIndexAfter).to.be.bignumber.equal(
                await calcDebtIndex(this.krAsset, debtIndexBefore, lastUpdateTimestamp),
            );
        });

        it("calculates correct debt index after year when amm price < oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const premiumPercentage = 90; // 90% eg. -10% premium

            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(1).mul(premiumPercentage).div(this.krAsset.deployArgs!.price);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({
                user: userOne,
                asset: this.krAsset,
                amount: amountIn,
            });

            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const debtIndexBefore = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            const lastUpdateTimestamp = await getBlockTimestamp();
            await time.increase(+ONE_YEAR);

            const debtIndexAfter = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);
            expect(debtIndexAfter).to.not.equal(debtIndexBefore);
            expect(debtIndexAfter).to.be.bignumber.equal(
                await calcDebtIndex(this.krAsset, debtIndexBefore, lastUpdateTimestamp),
            );
        });

        it("calculates correct debt index after a year for amm price == oracle", async function () {
            await updateTWAP();
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const debtIndexBefore = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            const lastUpdateTimestamp = await getBlockTimestamp();
            await time.increase(+ONE_YEAR);
            const debtIndexAfter = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);
            expect(debtIndexAfter).to.not.equal(debtIndexBefore);
            expect(debtIndexAfter).to.be.bignumber.equal(
                await calcDebtIndex(this.krAsset, debtIndexBefore, lastUpdateTimestamp),
            );
        });
    });
});
