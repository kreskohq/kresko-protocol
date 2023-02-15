import { toBig } from "@kreskolabs/lib/dist/numbers";
import { oneRay } from "@kreskolabs/lib/dist/numbers/wadray";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BASIS_POINT, defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { addLiquidity, getTWAPUpdaterFor, swap } from "@utils/test/helpers/amm";
import { ONE_YEAR, toScaledAmountUser } from "@utils/test/helpers/calculations";
import { depositCollateral } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, burnKrAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { KISS } from "types";
import { UniswapMath } from "types/typechain/src/contracts/test/markets";

const RATE_DELTA = hre.ethers.utils.parseUnits("100", "gwei");

describe("Stability Rates", function () {
    withFixture(["minter-test", "uniswap"]);
    let UniMath: UniswapMath;
    let userOne: SignerWithAddress;
    let userTwo: SignerWithAddress;

    let updateTWAP: () => Promise<void>;
    beforeEach(async function () {
        userOne = hre.users.deployer;
        userTwo = hre.users.userTwo;

        this.krAsset = hre.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
        this.collateral = hre.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);

        [UniMath] = await hre.deploy<UniswapMath>("UniswapMath", {
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

        await mintKrAsset({
            asset: this.krAsset,
            amount: kLiq,
            user: userOne,
        });
        const anchorBalance = await this.krAsset.anchor.balanceOf(hre.Diamond.address);
        expect(anchorBalance).to.equal(kLiq);
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

    describe("#debt calculation - mint", () => {
        const depositAmount = hre.toBig(1000);
        const mintAmount = hre.toBig(50);

        beforeEach(async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
        });

        it("calculates correct debt amount when amm price > oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
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
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });

            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);

            expect(debt).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));

            await time.increase(+ONE_YEAR);

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterYear).to.not.bignumber.equal(debt);
            expect(debtAfterYear).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));
        });

        it("calculates correct debt amount when amm price < oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
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
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));

            await time.increase(+ONE_YEAR);

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterYear).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));
        });

        it("calculates correct rate index after a year for amm price == oracle", async function () {
            await updateTWAP();
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });

            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));

            await time.increase(+ONE_YEAR);
            const debtIndex = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            expect(debtIndex.gt(oneRay)).to.be.true;

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterYear).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));
        });
    });
    describe("#debt calculation - repay", () => {
        const depositAmount = hre.toBig(100);
        const mintAmount = hre.toBig(10);

        beforeEach(async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
        });

        it("calculates correct repay amount when amm price > oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const premiumPercentage = 102; // 102% eg. 2% premium
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await this.collateral.setBalance(userOne, amountIn);

            // buy asset, increases price
            await swap({
                amount: amountIn,
                route: [this.collateral.address, this.krAsset.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.equal(await toScaledAmountUser(userTwo, mintAmount, this.krAsset));

            await time.increase(ONE_YEAR);

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const principalBefore = await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address);
            const burnAmount = mintAmount.div(2);

            await burnKrAsset({
                asset: this.krAsset,
                amount: burnAmount,
                user: userTwo,
            });
            const debtAfterBurn = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const principalAfter = await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address);

            expect(principalAfter).to.equal(principalBefore.sub(burnAmount));
            expect(debtAfterBurn).to.bignumber.closeTo(
                debtAfterYear.sub(burnAmount),
                hre.ethers.utils.parseUnits("10", "gwei"),
            );
        });

        it("calculates correct repay amount when amm price > oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const premiumPercentage = 98; // 101% eg. 1% premium
            const krAssetAmount = toBig(1);
            const collateralAmount = toBig(10).div(100).mul(premiumPercentage);

            const [amountIn] = await UniMath.profitMaximizingTrade(
                this.collateral.address,
                this.krAsset.address,
                collateralAmount,
                krAssetAmount,
            );
            await mintKrAsset({ user: userOne, asset: this.krAsset, amount: amountIn });

            // dump asset, decreases price
            await swap({
                amount: amountIn,
                route: [this.krAsset.address, this.collateral.address],
                router: hre.UniV2Router,
                user: userOne,
            });

            await updateTWAP();
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.closeTo(mintAmount, 10);

            const year = 60 * 60 * 24 * 365;
            await time.increase(year);
            const debtIndex = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            expect(debtIndex.gt(oneRay)).to.be.true;

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const halfBalanceAfterYear = (await this.krAsset.contract.balanceOf(userTwo.address)).div(2);

            await burnKrAsset({
                asset: this.krAsset,
                amount: halfBalanceAfterYear,
                user: userTwo,
            });
            const debtAfterBurn = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterBurn).to.bignumber.closeTo(debtAfterYear.sub(halfBalanceAfterYear), oneRay.div(10000));
        });

        it("calculates correct rate index after a year for amm price == oracle", async function () {
            await updateTWAP();
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.closeTo(mintAmount, 10);

            const year = 60 * 60 * 24 * 365;
            await time.increase(year);
            const debtIndex = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            expect(debtIndex.gt(oneRay)).to.be.true;

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const halfBalanceAfterYear = (await this.krAsset.contract.balanceOf(userTwo.address)).div(2);

            await burnKrAsset({
                asset: this.krAsset,
                amount: halfBalanceAfterYear,
                user: userTwo,
            });
            const debtAfterBurn = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterBurn).to.bignumber.closeTo(debtAfterYear.sub(halfBalanceAfterYear), oneRay.div(10000));
        });
    });

    describe("#debt calculation - repay interest", () => {
        const depositAmount = hre.toBig(100);
        const depositAmountBig = hre.toBig(10000);
        const mintAmount = hre.toBig(10);
        const mintAmountSmall = hre.toBig(2);

        beforeEach(async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
        });

        it("can view account principal debt for asset", async function () {
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);
            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            const expectedPrincipalDebt = mintAmount.mul(2);
            const principalDebtAfterOneYear = await hre.Diamond.kreskoAssetDebtPrincipal(
                userTwo.address,
                this.krAsset.address,
            );
            expect(principalDebtAfterOneYear).to.bignumber.equal(expectedPrincipalDebt);
        });

        it("can view account scaled debt for asset", async function () {
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);
            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            const principalDebt = await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address);
            const accruedInterest = await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, this.krAsset.address);

            const expectedScaledDebt = principalDebt.add(accruedInterest.assetAmount);

            const scaledDebt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(scaledDebt).to.bignumber.equal(expectedScaledDebt);
        });

        it("can view accrued interest in KISS", async function () {
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });

            await time.increase(ONE_YEAR);

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });

            const principalDebt = await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address);
            const scaledDebt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);

            const expectedValue = (
                await hre.Diamond.getKrAssetValue(this.krAsset.address, scaledDebt.sub(principalDebt), true)
            ).rawValue;

            const accruedInterest = await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, this.krAsset.address);

            // 8 decimals
            expect(accruedInterest.kissAmount).to.bignumber.equal(expectedValue.mul(10 ** 10));
        });

        it("can repay full interest with KISS", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);

            const minDebtAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10);
            await mintKrAsset({
                asset: KISS,
                amount: minDebtAmount,
                user: userTwo,
            });
            // get the principal before repayment
            const principalDebt = await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address);

            // repay accrued interest
            await hre.Diamond.connect(userTwo).repayFullStabilityRateInterest(userTwo.address, this.krAsset.address);

            // get values after repayment
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const accruedInterest = await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, this.krAsset.address);
            expect(accruedInterest.assetAmount).to.bignumber.eq(0);
            expect(debt).to.bignumber.eq(principalDebt);
        });

        it("can repay partial interest with KISS", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);

            const minDebtAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10);
            await mintKrAsset({
                asset: KISS,
                amount: minDebtAmount,
                user: userTwo,
            });
            const accruedInterestBefore = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );
            // get the principal before repayment
            const debtBefore = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);

            const repaymentAmount = accruedInterestBefore.kissAmount.div(5);
            const repaymentAmountAsset = accruedInterestBefore.assetAmount.div(5);

            // repay accrued interest
            await hre.Diamond.connect(userTwo).repayStabilityRateInterestPartial(
                userTwo.address,
                this.krAsset.address,
                repaymentAmount,
            );
            // get values after repayment
            const debtAfter = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const accruedInterestAfter = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );

            // TODO: calc exact values instead of closeTo
            expect(accruedInterestAfter.kissAmount).to.be.closeTo(
                accruedInterestBefore.kissAmount.sub(repaymentAmount),
                RATE_DELTA,
            );
            expect(debtAfter).to.be.closeTo(debtBefore.sub(repaymentAmountAsset), RATE_DELTA);
        });

        it("can repay all interest for multiple assets in batch", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            await this.collateral.setBalance(userTwo, depositAmountBig);
            // Deposit a bit more to cover the mints
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmountBig,
                user: userTwo,
            });
            // Create few krAssets
            const krAssets = await Promise.all(
                ["krasset2", "krasset3", "krasset4"].map(
                    async name =>
                        await addMockKreskoAsset({
                            name: name,
                            symbol: name,
                            marketOpen: true,
                            factor: 1,
                            closeFee: 0,
                            openFee: 0,
                            price: 10,
                            supplyLimit: 2_000,
                            stabilityRateBase: BASIS_POINT.mul(1000), // 10%
                        }),
                ),
            );
            // mint small amount of each krasset
            await Promise.all(
                krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmountSmall,
                        user: userTwo,
                    }),
                ),
            );
            const totalInterestInKISSBefore = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);

            // increase time
            await time.increase(ONE_YEAR);
            const interestAccrued = await Promise.all(
                krAssets.map(asset => hre.Diamond.kreskoAssetDebtInterest(userTwo.address, asset.address)),
            );
            const expectedKissAmount = interestAccrued.reduce((a, c) => a.add(c.kissAmount), BigNumber.from(0));

            const totalInterestInKISSAfter = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            expect(totalInterestInKISSBefore.lt(totalInterestInKISSAfter)).to.be.true;
            expect(totalInterestInKISSAfter).to.bignumber.equal(expectedKissAmount);

            const KISSMinAmount = toBig(10);
            await mintKrAsset({
                asset: KISS,
                amount: KISSMinAmount,
                user: userTwo,
            });

            await hre.Diamond.connect(userTwo).batchRepayFullStabilityRateInterest(userTwo.address);
            const totalInterestInKISSAfterRepay = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            expect(totalInterestInKISSAfterRepay).to.equal(0);
        });

        it("can repay all interest and principal for a single asset", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            const minDebtAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: KISS,
                amount: minDebtAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);
            const accruedInterestBeforeBurn = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );

            // repay accrued interest
            await hre.Diamond.connect(userTwo).burnKreskoAsset(
                userTwo.address,
                this.krAsset.address,
                hre.ethers.constants.MaxUint256,
                0,
            );
            const accruedInterestAfterBurn = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );

            // Ensure burning does not wipe interest accrued
            expect(accruedInterestAfterBurn.assetAmount.gt(accruedInterestBeforeBurn.assetAmount)).to.be.true;
            expect(accruedInterestAfterBurn.kissAmount.gt(accruedInterestBeforeBurn.kissAmount)).to.be.true;

            const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(userTwo.address);
            expect(mintedKreskoAssetsBefore.length).to.equal(2);
            await hre.Diamond.connect(userTwo).repayFullStabilityRateInterest(userTwo.address, this.krAsset.address);
            const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(userTwo.address);
            expect(mintedKreskoAssetsAfter.length).to.equal(1);

            const accruedInterestAfterRepayment = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );

            const principalDebt = await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address);
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);

            // Ensure debt actually gets wiped
            expect(principalDebt).to.equal(0);
            expect(accruedInterestAfterRepayment.assetAmount).to.equal(0);
            expect(accruedInterestAfterRepayment.kissAmount).to.equal(0);
            expect(debt).to.equal(0);

            await time.increase(ONE_YEAR);
            const accruedInterestYearAfterRepayment = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );

            // Sanity check with another year of time that there is no interest accrual
            expect(accruedInterestYearAfterRepayment.assetAmount).to.equal(0);
            expect(accruedInterestYearAfterRepayment.kissAmount).to.equal(0);

            // Get kr asset value, should be only KISS minted that remains
            const krAssetValue = (await hre.Diamond.getAccountKrAssetValue(userTwo.address)).rawValue;
            expect(krAssetValue).to.equal(toBig(10, 8));
        });

        it("can batch repay interest and all debt", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            const minDebtAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10);

            await this.collateral.setBalance(userTwo, depositAmountBig);
            // Deposit a bit more to cover the mints
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmountBig,
                user: userTwo,
            });
            await mintKrAsset({
                asset: KISS,
                amount: minDebtAmount,
                user: userTwo,
            });

            // Create few krAssets
            const krAssets = await Promise.all(
                ["krasset2", "krasset3", "krasset4"].map(
                    async name =>
                        await addMockKreskoAsset({
                            name: name,
                            symbol: name,
                            marketOpen: true,
                            factor: 1,
                            closeFee: 0,
                            openFee: 0,
                            price: 10,
                            supplyLimit: 2_000,
                            stabilityRateBase: BASIS_POINT.mul(1000), // 10%
                        }),
                ),
            );
            // mint small amount of each krasset
            await Promise.all(
                krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmountSmall,
                        user: userTwo,
                    }),
                ),
            );
            const totalInterestInKISSBefore = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);

            // increase time
            await time.increase(ONE_YEAR);
            const interestAccrued = await Promise.all(
                krAssets.map(asset => hre.Diamond.kreskoAssetDebtInterest(userTwo.address, asset.address)),
            );
            const expectedKissAmount = interestAccrued.reduce((a, c) => a.add(c.kissAmount), BigNumber.from(0));

            const totalInterestInKISSAfter = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            expect(totalInterestInKISSBefore.lt(totalInterestInKISSAfter)).to.be.true;
            expect(totalInterestInKISSAfter).to.bignumber.equal(expectedKissAmount);

            await Promise.all(
                krAssets.map(async asset =>
                    hre.Diamond.connect(userTwo).burnKreskoAsset(
                        userTwo.address,
                        asset.address,
                        hre.ethers.constants.MaxUint256,
                        await hre.Diamond.getMintedKreskoAssetsIndex(userTwo.address, asset.address),
                    ),
                ),
            );
            const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(userTwo.address);
            expect(mintedKreskoAssetsBefore.length).to.equal(4);

            await hre.Diamond.connect(userTwo).batchRepayFullStabilityRateInterest(userTwo.address);
            const totalInterestInKISSAfterRepay = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            expect(totalInterestInKISSAfterRepay).to.equal(0);
            const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(userTwo.address);
            expect(mintedKreskoAssetsAfter.length).to.equal(1);
        });

        it("can open up a new debt positions after wiping all debt + interest", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            const minDebtAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: KISS,
                amount: minDebtAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);
            const expectedDebtAfterOneYear = await toScaledAmountUser(userTwo, mintAmount, this.krAsset);
            expect(await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address)).to.eq(
                expectedDebtAfterOneYear,
            );

            // Wipe debt
            await hre.Diamond.connect(userTwo).burnKreskoAsset(
                userTwo.address,
                this.krAsset.address,
                hre.ethers.constants.MaxUint256,
                0,
            );

            const accruedInterest = (await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, this.krAsset.address))
                .assetAmount;

            // Mint again, before interest repayment
            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });

            // Ensure debt is principal + interest
            expect(await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address)).to.closeTo(
                mintAmount.add(accruedInterest),
                RATE_DELTA,
            );

            // Burn all assets
            await hre.Diamond.connect(userTwo).burnKreskoAsset(
                userTwo.address,
                this.krAsset.address,
                hre.ethers.constants.MaxUint256,
                0,
            );

            // Ensure debt is equal to interest
            const accruedInterestAfterBurn = (
                await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, this.krAsset.address)
            ).assetAmount;
            expect(await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address)).to.eq(
                accruedInterestAfterBurn,
            );

            // Repay all interest
            await hre.Diamond.connect(userTwo).repayFullStabilityRateInterest(userTwo.address, this.krAsset.address);
            // Debt should be wiped
            expect(await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address)).to.eq(0);

            // Mint again
            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            // Scaled should be equal to principal
            expect(await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address)).to.eq(mintAmount);

            // Advance time
            await time.increase(ONE_YEAR);

            // Ensure accrual is the same as the previous year with the same position
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.eq(expectedDebtAfterOneYear);
        });

        it("can fully close a position in single transaction using the helper function", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            const minDebtAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: KISS,
                amount: minDebtAmount,
                user: userOne,
            });

            await KISS.connect(userOne).transfer(userTwo.address, minDebtAmount);

            await mintKrAsset({
                asset: this.krAsset,
                amount: mintAmount,
                user: userTwo,
            });
            await time.increase(ONE_YEAR);

            await hre.Diamond.connect(userTwo).closeKrAssetDebtPosition(userTwo.address, this.krAsset.address);

            expect(await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address)).to.eq(0);
            expect(await hre.Diamond.kreskoAssetDebtPrincipal(userTwo.address, this.krAsset.address)).to.eq(0);
            const accruedInterest = await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, this.krAsset.address);
            expect(accruedInterest.assetAmount).to.eq(0);
            expect(accruedInterest.kissAmount).to.eq(0);
            expect((await hre.Diamond.getMintedKreskoAssets(userTwo.address)).length).to.eq(0);
        });

        it("can fully close all positions and interest in single transaction using the helper function", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(userTwo).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
            const kissAmount = (await hre.Diamond.minimumDebtValue()).rawValue.mul(10 ** 10).mul(2);

            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            await mintKrAsset({
                asset: KISS,
                amount: kissAmount,
                user: userOne,
            });

            await KISS.connect(userOne).transfer(userTwo.address, kissAmount);

            const krAssets = await Promise.all(
                ["krasset2", "krasset3", "krasset4"].map(
                    async name =>
                        await addMockKreskoAsset({
                            name: name,
                            symbol: name,
                            marketOpen: true,
                            factor: 1,
                            closeFee: 0,
                            openFee: 0,
                            price: 10,
                            supplyLimit: 2_000,
                            stabilityRateBase: BASIS_POINT.mul(1000), // 10%
                        }),
                ),
            );
            // mint small amount of each krasset
            await Promise.all(
                krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmountSmall,
                        user: userTwo,
                    }),
                ),
            );
            await time.increase(ONE_YEAR);

            // ~1M gas with 8 krAssets
            // console.log(+(await tx.wait()).gasUsed);
            await hre.Diamond.connect(userTwo).batchCloseKrAssetDebtPositions(userTwo.address);

            const accruedInterest = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            expect(accruedInterest).to.eq(0);
            expect((await hre.Diamond.getAccountKrAssetValue(userTwo.address)).rawValue).to.eq(0);
            expect((await hre.Diamond.getMintedKreskoAssets(userTwo.address)).length).to.eq(0);
        });
    });
});
