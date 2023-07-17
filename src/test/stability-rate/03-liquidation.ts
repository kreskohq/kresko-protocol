import { toBig, getInternalEvent, fromBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BASIS_POINT, defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { addLiquidity, getTWAPUpdaterFor } from "@utils/test/helpers/amm";
import { ONE_YEAR } from "@utils/test/helpers/calculations";
import { depositCollateral } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import { Error } from "@utils/test/errors";
import hre from "hardhat";
import {
    BatchInterestLiquidationOccurredEventObject,
    InterestLiquidationOccurredEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";
import { wrapContractWithSigner } from "@utils/test";

describe("Stability Rates", () => {
    withFixture(["minter-test", "uniswap"]);
    let liquidator: SignerWithAddress;
    let userTwo: SignerWithAddress;

    let updateTWAP: () => Promise<void>;
    beforeEach(async function () {
        liquidator = hre.users.deployer;
        userTwo = hre.users.userTwo;

        this.krAsset = hre.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;
        this.collateral = hre.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;

        const krAssetOraclePrice = 10;
        this.krAsset.setPrice(krAssetOraclePrice);
        const cLiq = toBig(1000);
        const kLiq = toBig(100);
        await this.collateral.setBalance(liquidator, cLiq.mul(2));
        await depositCollateral({
            asset: this.collateral,
            amount: cLiq,
            user: liquidator,
        });

        await mintKrAsset({
            asset: this.krAsset,
            amount: kLiq,
            user: liquidator,
        });
        const anchorBalance = await this.krAsset.anchor!.balanceOf(hre.Diamond.address);
        expect(anchorBalance).to.equal(kLiq);
        // 1000/100 = krAsset amm price 10
        const pair = await addLiquidity({
            user: liquidator,
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

    describe("#stability rate - liquidation", () => {
        const depositAmount = toBig(100);
        const mintAmount = toBig(10);
        let krAssets: TestKrAsset[];
        beforeEach(async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
            // Create few krAssets
            krAssets = await Promise.all(
                ["krasset2", "krasset3", "krasset4"].map(
                    async name =>
                        await addMockKreskoAsset({
                            name: name,
                            symbol: name,
                            marketOpen: true,
                            factor: 1.1,
                            closeFee: 0,
                            openFee: 0,
                            price: 10,
                            supplyLimit: 2_000,
                            stabilityRateBase: BASIS_POINT.mul(1000), // 10%
                        }),
                ),
            );
        });
        it("cannot liquidate accrued interest of healthy account", async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
            // Deposit a bit more to cover the mints
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            // mint each krasset
            await Promise.all(
                krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmount,
                        user: userTwo,
                    }),
                ),
            );

            await time.increase(ONE_YEAR);
            const krAsset = krAssets[0];

            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.false;
            await expect(
                wrapContractWithSigner(hre.Diamond, liquidator).liquidateInterest(
                    userTwo.address,
                    krAsset.address,
                    this.collateral.address,
                    false,
                ),
            ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
        });
        it("cannot batch liquidate accrued interest of healthy account", async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
            // Deposit a bit more to cover the mints
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            // mint each krasset
            await Promise.all(
                krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmount,
                        user: userTwo,
                    }),
                ),
            );

            await time.increase(ONE_YEAR);

            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.false;
            await expect(
                wrapContractWithSigner(hre.Diamond, liquidator).batchLiquidateInterest(
                    userTwo.address,
                    this.collateral.address,
                    false,
                ),
            ).to.be.revertedWith(Error.NOT_LIQUIDATABLE);
        });
        it("can liquidate accrued interest of unhealthy account", async function () {
            const KISS = await hre.getContractOrFork("KISS");

            // mint each krasset
            await Promise.all([
                await KISS.connect(liquidator).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                await this.collateral.setBalance(userTwo, depositAmount),
                // Deposit a bit more to cover the mints
                await depositCollateral({
                    asset: this.collateral,
                    amount: depositAmount,
                    user: userTwo,
                }),
                ...krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmount,
                        user: userTwo,
                    }),
                ),
            ]);

            // Up the asset prices
            const newPrice = 15;
            krAssets.map(asset => asset.setPrice(newPrice));
            // increase time so account is liquidatable
            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.false;
            await time.increase(ONE_YEAR * 4);

            // should be liquidatable
            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.true;

            // Asset to liquidate
            const krAsset = krAssets[0];

            const interestUSDTotal = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            // Liquidator mints KISS
            await mintKrAsset({
                asset: KISS,
                amount: interestUSDTotal.add(toBig(1)),
                user: liquidator,
            });
            // liquidatable value total before
            const accruedKissInterest = fromBig(
                (await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, krAsset.address)).kissAmount,
            );

            const accountCollateralBefore = await hre.Diamond.collateralDeposits(
                userTwo.address,
                this.collateral.address,
            );
            // Wipe seized collateral balance before liquidation for easy comparison
            await this.collateral.setBalance(liquidator, toBig(0));

            // Liquidate
            const tx = await wrapContractWithSigner(hre.Diamond, liquidator).liquidateInterest(
                userTwo.address,
                krAsset.address,
                this.collateral.address,
                false,
            );

            // Should all be wiped
            const interestAccruedAfterLiq = await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, krAsset.address);
            expect(interestAccruedAfterLiq.kissAmount).to.eq(0);
            expect(interestAccruedAfterLiq.assetAmount).to.eq(0);

            const accountCollateralAfter = await hre.Diamond.collateralDeposits(
                userTwo.address,
                this.collateral.address,
            );

            const event = await getInternalEvent<InterestLiquidationOccurredEventObject>(
                tx,
                hre.Diamond,
                "InterestLiquidationOccurred",
            );

            // validate interest accrual changes
            expect(accountCollateralAfter).to.equal(accountCollateralBefore.sub(event.collateralSent));
            const liquidationIncentive = fromBig(
                (await hre.Diamond.collateralAsset(this.collateral.address)).liquidationIncentive,
            );
            const expectedCollateral =
                (accruedKissInterest / fromBig(await this.collateral.getPrice(), 8)) * liquidationIncentive;
            // event validation
            expect(event.account).to.equal(userTwo.address);
            expect(event.liquidator).to.equal(liquidator.address);
            expect(event.repayKreskoAsset).to.equal(krAsset.address);
            expect(event.seizedCollateralAsset).to.equal(this.collateral.address);
            expect(fromBig(event.repayUSD)).to.closeTo(accruedKissInterest, 0.0001);
            expect(fromBig(event.collateralSent).toFixed(6)).to.equal(expectedCollateral.toFixed(6));
            // liquidator received collateral
            expect(await this.collateral.contract.balanceOf(liquidator.address)).to.equal(event.collateralSent);
        });
        it("cannot underflow seized collateral without liquidators permission", async function () {
            const KISS = await hre.getContractOrFork("KISS");

            // mint each krasset
            await Promise.all([
                await KISS.connect(liquidator).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                await this.collateral.setBalance(userTwo, depositAmount),
                // Deposit a bit more to cover the mints
                await depositCollateral({
                    asset: this.collateral,
                    amount: depositAmount,
                    user: userTwo,
                }),
                ...krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmount,
                        user: userTwo,
                    }),
                ),
            ]);

            // Up the asset prices
            const newPrice = 15;
            krAssets.map(asset => asset.setPrice(newPrice));
            // increase time by a lot, so account is liquidatable and seized collateral will underflow
            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.false;
            await time.increase(ONE_YEAR * 40);

            // should be liquidatable
            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.true;

            // Asset to liquidate
            const krAsset = krAssets[0];

            const interestUSDTotal = await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address);
            // Liquidator mints KISS
            await mintKrAsset({
                asset: KISS,
                amount: interestUSDTotal.add(toBig(1)),
                user: liquidator,
            });

            // Wipe seized collateral balance before liquidation for easy comparison
            await this.collateral.setBalance(liquidator, toBig(0));

            // Liquidate
            await expect(
                wrapContractWithSigner(hre.Diamond, liquidator).liquidateInterest(
                    userTwo.address,
                    krAsset.address,
                    this.collateral.address,
                    false,
                ),
            ).to.be.revertedWith(Error.SEIZED_COLLATERAL_UNDERFLOW);
        });

        it("can batch liquidate accrued interest of unhealthy account", async function () {
            const KISS = await hre.getContractOrFork("KISS");
            await KISS.connect(liquidator).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

            await this.collateral.setBalance(userTwo, depositAmount);
            // Deposit a bit more to cover the mints
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
                user: userTwo,
            });

            // mint each krasset
            await Promise.all(
                krAssets.map(krAsset =>
                    mintKrAsset({
                        asset: krAsset,
                        amount: mintAmount,
                        user: userTwo,
                    }),
                ),
            );

            // Up the asset prices
            const newPrice = 15;
            krAssets.map(asset => asset.setPrice(newPrice));
            // increase time so account is liquidatable
            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.false;
            await time.increase(ONE_YEAR * 4);

            // should be liquidatable
            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.true;

            const interestKissTotal = fromBig(await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address));
            // Liquidator mints KISS
            await mintKrAsset({
                asset: KISS,
                amount: interestKissTotal + 1,
                user: liquidator,
            });

            // Wipe seized collateral balance before liquidation for easy comparison
            await this.collateral.setBalance(liquidator, toBig(0));
            // Liquidate
            const tx = await wrapContractWithSigner(hre.Diamond, liquidator).batchLiquidateInterest(
                userTwo.address,
                this.collateral.address,
                false,
            );

            const interestKissTotalAfter = fromBig(await hre.Diamond.kreskoAssetDebtInterestTotal(userTwo.address));

            expect(await hre.Diamond.isAccountLiquidatable(userTwo.address)).to.be.false;

            const event = await getInternalEvent<BatchInterestLiquidationOccurredEventObject>(
                tx,
                hre.Diamond,
                "BatchInterestLiquidationOccurred",
            );
            const repayUSD = fromBig(event.repayUSD);

            // interest accrued changes
            expect(interestKissTotalAfter).to.closeTo(interestKissTotal - fromBig(event.repayUSD), 0.0001);
            const liquidationIncentive = fromBig(
                (await hre.Diamond.collateralAsset(this.collateral.address)).liquidationIncentive,
            );
            const expectedCollateral = (repayUSD / fromBig(await this.collateral.getPrice(), 8)) * liquidationIncentive;
            // event validation
            expect(event.account).to.equal(userTwo.address);
            expect(event.liquidator).to.equal(liquidator.address);
            expect(event.seizedCollateralAsset).to.equal(this.collateral.address);
            expect(fromBig(event.collateralSent)).to.closeTo(expectedCollateral, 0.0001);
            expect(repayUSD).to.closeTo(interestKissTotal - interestKissTotalAfter, 0.0001);
            // liquidator received collateral
            expect(await this.collateral.contract.balanceOf(liquidator.address)).to.equal(event.collateralSent);
        });
    });
});
