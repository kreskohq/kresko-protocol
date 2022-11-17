import { toBig } from "@kreskolabs/lib/dist/numbers";
import { oneRay } from "@kreskolabs/lib/dist/numbers/wadray";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { addLiquidity, getTWAPUpdaterFor, swap } from "@utils/test/helpers/amm";
import { ONE_YEAR } from "@utils/test/helpers/calculations";
import { depositCollateral } from "@utils/test/helpers/collaterals";
import { burnKrAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import hre from "hardhat";
import { UniswapMath } from "types/typechain/src/contracts/test/markets";

describe("Stability Rates", function () {
    withFixture(["minter-test", "stability-rate-debt", "uniswap"]);
    let users: Users;
    let UniMath: UniswapMath;
    let userOne: SignerWithAddress;
    let userTwo: SignerWithAddress;

    let updateTWAP: () => Promise<void>;
    beforeEach(async function () {
        users = await hre.getUsers();
        userOne = users.deployer;
        userTwo = users.userTwo;

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

    describe("#debt calculation - mint", async () => {
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
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.closeTo(mintAmount, 10);

            const year = 60 * 60 * 24 * 365;
            await time.increase(year);
            const debtIndex = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            expect(debtIndex.gt(oneRay)).to.be.true;

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterYear).to.bignumber.closeTo(mintAmount.rayMul(debtIndex), oneRay.div(10000));
        });

        it("calculates correct debt amount when amm price < oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);
            const premiumPercentage = 98; // 98% eg. -2% premium
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
            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debt).to.bignumber.closeTo(mintAmount, 10);

            const year = 60 * 60 * 24 * 365;
            await time.increase(year);
            const debtIndex = await hre.Diamond.getDebtIndexForAsset(this.krAsset.address);

            expect(debtIndex.gt(oneRay)).to.be.true;

            const debtAfterYear = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            expect(debtAfterYear).to.bignumber.closeTo(mintAmount.rayMul(debtIndex), oneRay.div(10000));
        });

        it("calculates correct rate index after a year for amm price == oracle", async function () {
            await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

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
            expect(debtAfterYear).to.bignumber.closeTo(mintAmount.rayMul(debtIndex), oneRay.div(10000));
        });
    });
    describe("#debt calculation - repay", async () => {
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
            expect(debt).to.bignumber.closeTo(mintAmount, 10);

            await time.increase(ONE_YEAR);
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
            // await hre.Diamond.updateStabilityRateAndIndexForAsset(this.krAsset.address);

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

    describe.only("#debt calculation - repay interest", async () => {
        const depositAmount = hre.toBig(100);
        const mintAmount = hre.toBig(10);
        beforeEach(async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
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

            const debt = await hre.Diamond.kreskoAssetDebt(userTwo.address, this.krAsset.address);
            const [accruedDebt, accruedDebtKiss] = await hre.Diamond.kreskoAssetDebtInterest(
                userTwo.address,
                this.krAsset.address,
            );

            console.log(+debt);
            console.log(+accruedDebt);
            console.log(+accruedDebtKiss);
        });
        it("can repay interest with KISS");
    });
});
