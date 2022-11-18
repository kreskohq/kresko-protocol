import { getInternalEvent, getNamedEvent } from "@kreskolabs/lib";
import { toBig } from "@kreskolabs/lib/dist/numbers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BASIS_POINT, defaultCollateralArgs, defaultKrAssetArgs, withFixture } from "@utils/test";
import { addLiquidity, getTWAPUpdaterFor } from "@utils/test/helpers/amm";
import { ONE_YEAR } from "@utils/test/helpers/calculations";
import { depositCollateral } from "@utils/test/helpers/collaterals";
import { EventContract } from "@utils/test/helpers/events";
import { addMockKreskoAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import hre, { fromBig } from "hardhat";
import { KISS } from "types";
import {
    InterestLiquidationOccurredEvent,
    InterestLiquidationOccurredEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

const RATE_DELTA = hre.ethers.utils.parseUnits("100", "gwei");

describe("Stability Rates", function () {
    withFixture(["minter-test", "stability-rate-liquidation", "uniswap"]);
    let users: Users;
    let liquidator: SignerWithAddress;
    let userTwo: SignerWithAddress;

    let updateTWAP: () => Promise<void>;
    beforeEach(async function () {
        users = await hre.getUsers();
        liquidator = users.deployer;
        userTwo = users.userTwo;

        this.krAsset = hre.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
        this.collateral = hre.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);

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
        const anchorBalance = await this.krAsset.anchor.balanceOf(hre.Diamond.address);
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

    describe("#stability rate - liquidation", async () => {
        const depositAmount = hre.toBig(100);
        const mintAmount = hre.toBig(10);

        beforeEach(async function () {
            await this.collateral.setBalance(userTwo, depositAmount);
        });

        it.only("can liquidate accrued interest of unhealthy position", async function () {
            const KISS = await hre.ethers.getContract<KISS>("KISS");
            await KISS.connect(liquidator).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);

            await this.collateral.setBalance(userTwo, depositAmount);
            // Deposit a bit more to cover the mints
            await depositCollateral({
                asset: this.collateral,
                amount: depositAmount,
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
                            factor: 1.1,
                            closeFee: 0,
                            openFee: 0,
                            price: 10,
                            supplyLimit: 2_000,
                            stabilityRateBase: BASIS_POINT.mul(1000), // 10%
                        }),
                ),
            );
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
            const accruedInterestUSD = fromBig(
                (await hre.Diamond.kreskoAssetDebtInterest(userTwo.address, krAsset.address)).kissAmount,
            );
            const tx = await hre.Diamond.connect(liquidator).liquidateInterest(
                userTwo.address,
                krAsset.address,
                this.collateral.address,
            );

            const event = await getInternalEvent<InterestLiquidationOccurredEventObject>(
                tx,
                EventContract(),
                "InterestLiquidationOccurred",
            );
            const liquidationIncentive = fromBig((await hre.Diamond.liquidationIncentiveMultiplier()).rawValue);
            const expectedCollateral =
                (accruedInterestUSD / fromBig(await this.collateral.getPrice(), 8)) * liquidationIncentive;
            expect(event.account).to.equal(userTwo.address);
            expect(event.liquidator).to.equal(liquidator.address);
            expect(event.repayKreskoAsset).to.equal(krAsset.address);
            expect(event.seizedCollateralAsset).to.equal(this.collateral.address);
            expect(fromBig(event.collateralSent).toFixed(6)).to.equal(expectedCollateral.toFixed(6));
            expect(fromBig(event.repayUSD)).to.closeTo(accruedInterestUSD, 0.0001);
        });
    });
});
