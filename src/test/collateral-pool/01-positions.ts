import { getPositionsInitializer } from "@deploy-config/shared";
import { RAY, fromBig, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import { getBlockTimestamp } from "@utils/test/helpers/calculations";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { Positions } from "types/typechain";
import { NewPositionStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Positions";

describe("Leverage Positions NFT", function () {
    it("should deploy with correct configuration", async () => {
        const initializerArgs = (await getPositionsInitializer(hre)).args;
        expect(await positions.name()).to.equal("Kresko Positions");
        expect(await positions.symbol()).to.equal("krPOS");
        const config = await positions.getPositionsConfig();
        expect(config.kresko).to.equal(hre.Diamond.address);
        expect(config.liquidationThreshold).to.equal(initializerArgs.liquidationThreshold);
        expect(config.closeThreshold).to.equal(initializerArgs.closeThreshold);
        expect(config.maxLeverage).to.equal(initializerArgs.maxLeverage);
        expect(config.minLeverage).to.equal(initializerArgs.minLeverage);
    });

    describe("Positions", () => {
        let position: NewPositionStruct;
        it("should be able to mint a position with leverage", async () => {
            const PositionsUser = positions.connect(users[1]);
            await expect(PositionsUser.createPosition(position)).to.not.be.reverted;
        });

        it("should have correct leverage on successive positions", async () => {
            const PositionsUser = positions.connect(users[1]);

            await PositionsUser.createPosition(position);
            const timestamp0 = await getBlockTimestamp();
            const expectedKissBalance = toBig(ETHPrice).sub(toBig(ETHPrice).wadMul(toBig(0.02)));
            expect(await krETH.contract.balanceOf(positions.address)).to.equal(position.amountBMin);
            expect(await KISS.contract.balanceOf(positions.address)).to.equal(0);
            expect(await KISS.contract.balanceOf(hre.Diamond.address)).to.equal(expectedKissBalance); // 1764

            const [positionNFT0] = await positions.getPosition(0);
            expect(positionNFT0.leverage).to.equal(toBig(2));
            expect(positionNFT0.assetA).to.equal(KISS.address);
            expect(positionNFT0.assetB).to.equal(krETH.address);
            expect(positionNFT0.account).to.equal(users[1].address);
            expect(positionNFT0.creationTimestamp).to.be.equal(timestamp0);
            expect(positionNFT0.lastUpdateTimestamp).to.be.equal(timestamp0);
            expect(positionNFT0.amountA).to.equal(expectedKissBalance);
            expect(positionNFT0.amountB).to.equal(position.amountBMin);
            expect(positionNFT0.nonce).to.equal(0);

            const newLeverage = toBig(3);
            const totalFeePct = toBig(0.01).wadMul(newLeverage);
            const amountBWithFees = toBig(1).wadMul(newLeverage);
            const fees = amountBWithFees.wadMul(totalFeePct);
            await PositionsUser.createPosition({
                ...position,
                leverage: newLeverage,
                amountBMin: amountBWithFees.sub(fees),
            });
            const timestamp1 = await getBlockTimestamp();

            const expectedTotalamountB = BigNumber.from(position.amountBMin).add(amountBWithFees.sub(fees));
            const expectedKissBalance2 = toBig(ETHPrice).sub(toBig(ETHPrice).wadMul(totalFeePct));
            expect(await krETH.contract.balanceOf(positions.address)).to.equal(expectedTotalamountB);
            expect(await KISS.contract.balanceOf(positions.address)).to.equal(0);
            expect(await KISS.contract.balanceOf(hre.Diamond.address)).to.equal(
                expectedKissBalance.add(expectedKissBalance2),
            ); // 1764

            const [positionNFT1] = await positions.getPosition(1);
            expect(positionNFT1.leverage).to.equal(newLeverage);
            expect(positionNFT1.assetA).to.equal(KISS.address);
            expect(positionNFT1.assetB).to.equal(krETH.address);
            expect(positionNFT1.account).to.equal(users[1].address);
            expect(positionNFT1.creationTimestamp).to.be.equal(timestamp1);
            expect(positionNFT1.lastUpdateTimestamp).to.be.equal(timestamp1);
            expect(positionNFT1.amountA).to.equal(expectedKissBalance2);
            expect(positionNFT1.amountB).to.equal(amountBWithFees.sub(fees));
            expect(positionNFT1.nonce).to.equal(0);
        });

        it("should calculate correct ratios for winning and losing positions", async () => {
            const PositionsUser = positions.connect(users[1]);
            const initialLeverage = toBig(2);
            await PositionsUser.createPosition({ ...position, leverage: initialLeverage, amountBMin: 0 });

            // long asset goes up, so goes ratio
            krETH.setPrice(3600);
            const [, ratio] = await PositionsUser.getPosition(0);
            expect(ratio).to.equal(toBig(2));

            // long asset goes down, so goes ratio
            krETH.setPrice(900);
            const [, ratio1] = await PositionsUser.getPosition(0);
            expect(ratio1).to.equal(toBig(-1));

            krETH.setPrice(1800); // normalize price

            // short asset goes up, ratio goes DOWN
            KISS.setPrice(2);
            const [, ratio3] = await PositionsUser.getPosition(0);
            expect(ratio3).to.equal(toBig(-1));

            // short asset goes down, ratio goes UP
            KISS.setPrice(0.5);
            const [, ratio4] = await PositionsUser.getPosition(0);
            expect(ratio4).to.equal(toBig(2));
        });

        it("should increase pool debt and assetA accordingly", async () => {
            const PositionsUser = positions.connect(users[1]);
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);
            expect(poolStatsBefore.cr).to.be.eq(0);
            await expect(PositionsUser.createPosition(position)).to.not.be.reverted;
            const [pos] = await positions.getPosition(0);
            const poolStats = await hre.Diamond.getPoolStats(true);
            expect(poolStats.debtValue).to.equal(pos.amountB.wadMul(toBig(ETHPrice, 8)));
            expect(poolStats.cr).to.be.gt(0);
            expect(poolStats.collateralValue).to.equal(poolStatsBefore.collateralValue.add(fromBig(pos.amountA, 10)));
        });

        it("should increase pool debt and assetA accordingly, after increase in position", async () => {
            const PositionsUser = positions.connect(users[1]);
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);

            expect(poolStatsBefore.cr).to.be.eq(0);
            await expect(PositionsUser.createPosition(position)).to.not.be.reverted;

            const [pos] = await positions.getPosition(0);
            const poolStats = await hre.Diamond.getPoolStats(true);

            expect(poolStats.debtValue).to.equal(pos.amountB.wadMul(toBig(ETHPrice, 8)));
            expect(poolStats.cr).to.be.gt(0);
            expect(poolStats.collateralValue).to.equal(poolStatsBefore.collateralValue.add(fromBig(pos.amountA, 10)));

            await PositionsUser.buy(0, toBig(1800), 0);

            const poolStatsAfter = await hre.Diamond.getPoolStats(true);

            expect(poolStatsAfter.debtValue).to.equal(poolStats.debtValue.mul(2));
            expect(poolStatsAfter.cr).to.be.lt(poolStats.cr);
            expect(poolStatsAfter.collateralValue).to.equal(
                poolStatsBefore.collateralValue.add(fromBig(pos.amountA.mul(2), 10)),
            );
        });

        it("should be able to close a position and reduce pool debt and assetA accordingly", async () => {
            const PositionsUser = positions.connect(users[1]);

            expect(await KISS.contract.balanceOf(users[1].address)).to.equal(amountA18Dec);
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);
            await PositionsUser.createPosition(position);
            await PositionsUser.closePosition(0);
            const poolStatsAfter = await hre.Diamond.getPoolStats(true);
            expect(poolStatsAfter.debtValue).to.equal(poolStatsBefore.debtValue);
            expect(poolStatsAfter.collateralValue).to.equal(poolStatsBefore.collateralValue);
            expect(poolStatsAfter.cr).to.equal(0);
            expect(await KISS.contract.balanceOf(users[1].address)).to.equal(toBig(9928.72));
        });
        it("should make profit for the position", async () => {
            const PositionsUser = positions.connect(users[1]);
            const balBefore = await KISS.contract.balanceOf(users[1].address);
            expect(await KISS.contract.balanceOf(users[1].address)).to.equal(amountA18Dec);
            await PositionsUser.createPosition({ ...position, leverage: toBig(2), amountBMin: 0 });
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);
            krETH.setPrice(2000);

            await PositionsUser.closePosition(0);
            const poolStatsAfter = await hre.Diamond.getPoolStats(true);
            const balAfter = await KISS.contract.balanceOf(users[1].address);

            const debtKISS = await hre.Diamond.getPoolDebt(KISS.address);
            const debtkrETH = await hre.Diamond.getPoolDebt(krETH.address);

            expect(debtkrETH).to.be.eq(0);
            expect(debtKISS).to.be.eq(toBig(392));
            expect(balAfter).to.be.gt(balBefore);
            expect(poolStatsAfter.debtValue).to.be.eq(toBig(392, 8));
            expect(poolStatsAfter.collateralValue).to.be.lt(poolStatsBefore.collateralValue);
            expect(poolStatsAfter.cr).to.be.gt(poolStatsBefore.cr);
        });
        it("should incur losses for the position", async () => {
            const PositionsUser = positions.connect(users[1]);
            const balBefore = await KISS.contract.balanceOf(users[1].address);
            await PositionsUser.createPosition({ ...position, leverage: toBig(2), amountBMin: 0 });
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);
            krETH.setPrice(1600);

            await PositionsUser.closePosition(0);
            const poolStatsAfter = await hre.Diamond.getPoolStats(true);
            const balAfter = await KISS.contract.balanceOf(users[1].address);

            const debtKISS = await hre.Diamond.getPoolDebt(KISS.address);
            const debtkrETH = await hre.Diamond.getPoolDebt(krETH.address);

            expect(debtkrETH).to.be.eq(0);
            expect(debtKISS).to.be.eq(0);
            expect(balAfter).to.be.lt(balBefore);
            expect(poolStatsAfter.debtValue).to.be.eq(0);

            expect(poolStatsAfter.collateralValue).to.be.lt(poolStatsBefore.collateralValue);
            expect(poolStatsAfter.cr).to.be.eq(0);
        });

        it("should offset wins by losses within the protocol", async () => {
            const PositionsUser = positions.connect(users[1]);

            await PositionsUser.createPosition({ ...position, leverage: toBig(2), amountBMin: 0 });

            krETH.setPrice(1600);

            await PositionsUser.closePosition(0);

            krETH.setPrice(1800);

            await PositionsUser.createPosition({ ...position, leverage: toBig(2), amountBMin: 0 });

            krETH.setPrice(2000);

            await PositionsUser.closePosition(1);

            const poolStatsAfter = await hre.Diamond.getPoolStats(true);

            const debtKISS = await hre.Diamond.getPoolDebt(KISS.address);
            const debtkrETH = await hre.Diamond.getPoolDebt(krETH.address);

            expect(debtkrETH).to.be.eq(0);
            expect(debtKISS).to.be.eq(0);
            expect(poolStatsAfter.debtValue).to.be.eq(0);
            expect(poolStatsAfter.cr).to.be.eq(0);
        });
        it("anyone should be able to liquidate a losing position", async () => {
            const PositionsUser = positions.connect(users[1]);

            await PositionsUser.createPosition({ ...position, leverage: toBig(3), amountBMin: 0 });
            const liquidator = users[0];
            krETH.setPrice(1500); // 2.5
            const [pos, ratio] = await positions.getPosition(0);
            expect(ratio).to.be.lt(pos.leverage);
            const [isLiquidatable] = await positions.isLiquidatable([0]);
            expect(isLiquidatable).to.be.true;

            await positions.connect(liquidator).closePosition(0);

            const poolStatsAfter = await hre.Diamond.getPoolStats(true);

            const debtKISS = await hre.Diamond.getPoolDebt(KISS.address);
            const debtkrETH = await hre.Diamond.getPoolDebt(krETH.address);

            expect(debtkrETH).to.be.eq(0);
            expect(debtKISS).to.be.eq(0);
            expect(poolStatsAfter.debtValue).to.be.eq(0);
            expect(poolStatsAfter.cr).to.be.eq(0);
        });
        it("anyone should be able to close a winning position", async () => {
            const PositionsUser = positions.connect(users[1]);

            await PositionsUser.createPosition({ ...position, leverage: toBig(3), amountBMin: 0 });
            const closer = users[0];
            krETH.setPrice(2100); // 2.5
            const [, ratio] = await positions.getPosition(0);
            expect(ratio).to.be.eq((0.5e18).toString());
            const [isClosable] = await positions.isClosable([0]);
            expect(isClosable).to.be.true;

            await positions.connect(closer).closePosition(0);

            const poolStatsAfter = await hre.Diamond.getPoolStats(true);

            const debtKISS = await hre.Diamond.getPoolDebt(KISS.address);
            const debtkrETH = await hre.Diamond.getPoolDebt(krETH.address);

            expect(debtkrETH).to.be.eq(0);
            expect(debtKISS).to.be.gt(0);
            expect(poolStatsAfter.debtValue).to.be.gt(0);
            expect(poolStatsAfter.cr).to.be.gt(0);
        });

        it("should be able to deposit more assetA into a position", async () => {
            const PositionsUser = positions.connect(users[1]);
            const initialLeverage = toBig(2);
            await PositionsUser.createPosition({ ...position, leverage: initialLeverage, amountBMin: 0 });
            await PositionsUser.deposit(0, toBig(100));
            const [pos, ratio] = await PositionsUser.getPosition(0);
            expect(ratio).to.be.lt(initialLeverage);
            expect(pos.leverage).to.be.lt(initialLeverage);
        });

        it("should be able to reduce a position", async () => {
            const PositionsUser = positions.connect(users[1]);
            const initialLeverage = toBig(2);

            await PositionsUser.createPosition({ ...position, leverage: initialLeverage, amountBMin: 0 });
            const [positionBefore] = await PositionsUser.getPosition(0);
            await PositionsUser.buyback(0, positionBefore.amountB.div(2));
            const [positionAfter] = await PositionsUser.getPosition(0);
            expect(positionAfter.leverage).to.be.eq(initialLeverage);
            expect(positionAfter.amountB).to.be.eq(positionBefore.amountB.div(2));
            expect(positionAfter.amountA).to.be.eq(positionBefore.amountA.div(2));
        });

        it("should be able to buy more assetB in the position", async () => {
            const PositionsUser = positions.connect(users[1]);
            const initialLeverage = toBig(2);
            await PositionsUser.createPosition({ ...position, leverage: initialLeverage, amountBMin: 0 });

            const [posBefore, ratioBefore] = await PositionsUser.getPosition(0);
            expect(posBefore.leverage).to.be.eq(initialLeverage);
            expect(ratioBefore).to.be.eq(0);

            const depositAmount = toBig(1800);

            await PositionsUser.buy(0, depositAmount, 0);

            const [pos, ratio] = await PositionsUser.getPosition(0);
            expect(pos.leverage).to.be.eq(initialLeverage);
            expect(ratio).to.be.eq(0);
            expect(pos.amountA).to.be.eq(posBefore.amountA.mul(2));
            expect(pos.amountB).to.be.eq(posBefore.amountB.mul(2));
        });

        it("should be liquidatable at the same price with withdrawals", async () => {
            const PositionsUser = positions.connect(users[1]);
            const initialLeverage = toBig(2.005);

            await PositionsUser.createPosition({
                ...position,
                leverage: initialLeverage,
                amountBMin: 0,
            });
            expect((await PositionsUser.isLiquidatable([0]))[0]).to.be.false;

            krETH.setPrice(1351.9);
            expect((await PositionsUser.isLiquidatable([0]))[0]).to.be.false;

            krETH.setPrice(1351.1);
            expect((await PositionsUser.isLiquidatable([0]))[0]).to.be.true;
            krETH.setPrice(1351.2);
            expect((await PositionsUser.isLiquidatable([0]))[0]).to.be.false;
            await PositionsUser.closePosition(0);
            krETH.setPrice(1800);

            await PositionsUser.createPosition({
                ...position,
                leverage: toBig(2),
                amountBMin: 0,
            });

            await PositionsUser.withdraw(1, toBig(4.4));
            expect((await PositionsUser.getPosition([1]))[0].leverage).to.be.closeTo(initialLeverage, toBig(0.00001));
            expect((await PositionsUser.isLiquidatable([1]))[0]).to.be.false;

            krETH.setPrice(1351.1);
            expect((await PositionsUser.isLiquidatable([1]))[0]).to.be.true;

            krETH.setPrice(1351.2);
            expect((await PositionsUser.isLiquidatable([0]))[0]).to.be.false;
        });

        it("should be able to withdraw assetA", async () => {
            const PositionsUser = positions.connect(users[1]);
            const leverage = toBig(2);
            await PositionsUser.createPosition({ ...position, leverage, amountBMin: 0 });

            krETH.setPrice(1600);
            await PositionsUser.withdraw(0, toBig(450));
            await PositionsUser.closePosition(0);

            const poolStatsAfter = await hre.Diamond.getPoolStats(true);

            const debtKISS = await hre.Diamond.getPoolDebt(KISS.address);
            const debtkrETH = await hre.Diamond.getPoolDebt(krETH.address);

            expect(debtkrETH).to.be.eq(0);
            expect(debtKISS).to.be.eq(0);
            expect(poolStatsAfter.debtValue).to.be.eq(0);
            expect(poolStatsAfter.cr).to.be.eq(0);
        });
        it("should revert withdrawing too much assetA", async () => {
            const PositionsUser = positions.connect(users[1]);
            const leverage = toBig(2);
            await PositionsUser.createPosition({ ...position, leverage, amountBMin: 0 });

            krETH.setPrice(1600);
            await expect(PositionsUser.withdraw(0, toBig(550))).to.be.revertedWith("!leverage");
        });

        beforeEach(async () => {
            depositor = hre.users.testUserOne;
            const krETHFee = toBig(0.005);
            const KISSFee = toBig(0.005);

            const leverage = toBig(2);
            const totalFeePct = krETHFee.add(KISSFee).wadMul(leverage);
            const amountBWithFees = toBig(1).wadMul(leverage);
            const fees = amountBWithFees.wadMul(totalFeePct);
            position = {
                account: users[1].address,
                leverage: leverage,
                assetA: KISS.address,
                amountA: toBig(ETHPrice), // 1 eth
                assetB: krETH.address,
                amountBMin: amountBWithFees.sub(fees), // 1.96 eth
            };
            await hre.Diamond.enablePoolCollaterals(
                [assetAAsset.address, assetAAsset8Dec.address, KISS.address, krETH.address],
                [
                    {
                        decimals: 18,
                        liquidationIncentive: toBig(1.05),
                        liquidityIndex: RAY,
                    },
                    {
                        decimals: 8,
                        liquidationIncentive: toBig(1.05),
                        liquidityIndex: RAY,
                    },
                    {
                        decimals: 18,
                        liquidationIncentive: toBig(1.05),
                        liquidityIndex: RAY,
                    },
                    {
                        decimals: 18,
                        liquidationIncentive: toBig(1.05),
                        liquidityIndex: RAY,
                    },
                ],
            );
            await hre.Diamond.enablePoolKrAssets(
                [KISS.address, krETH.address],
                [
                    {
                        openFee: KISSFee,
                        closeFee: KISSFee,
                        protocolFee: toBig(0.25),
                        supplyLimit: toBig(1000000),
                    },
                    {
                        openFee: krETHFee,
                        closeFee: krETHFee,
                        protocolFee: toBig(0.25),
                        supplyLimit: toBig(1000000),
                    },
                ],
            );

            await hre.Diamond.setSwapPairs([
                {
                    assetIn: KISS.address,
                    assetOut: krETH.address,
                    enabled: true,
                },
            ]);

            await hre.Diamond.connect(depositor).poolDeposit(depositor.address, assetAAsset.address, amountA18Dec);

            await KISS.setBalance(users[1], amountA18Dec);
            await KISS.contract.connect(users[1]).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        });
    });

    withFixture(["minter-init"]);

    let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;
    let krETH: Awaited<ReturnType<typeof addMockKreskoAsset>>;

    let assetAAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let assetAAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;

    const assetAPrice = 10;
    const KISSPrice = 1;
    const ETHPrice = 1800;

    let depositor: SignerWithAddress;
    let users: SignerWithAddress[];

    const depositAmount = 10000;
    const amountA18Dec = toBig(depositAmount);
    const depositAmount8Dec = toBig(depositAmount, 8);
    beforeEach(async () => {
        depositor = hre.users.testUserOne;
        users = [hre.users.testUserFive, hre.users.testUserSix];
        positions = await hre.getContractOrFork("Positions");

        [KISS, krETH, assetAAsset, assetAAsset8Dec] = await Promise.all([
            addMockKreskoAsset(
                {
                    name: "KISS",
                    price: KISSPrice,
                    symbol: "KISS",
                    closeFee: 0.1,
                    openFee: 0.1,
                    marketOpen: true,
                    factor: 1,
                    supplyLimit: 100_000,
                },
                true,
            ),
            addMockKreskoAsset(
                {
                    name: "krETH",
                    price: ETHPrice,
                    symbol: "krETH",
                    closeFee: 0.1,
                    openFee: 0.1,
                    marketOpen: true,
                    factor: 1,
                    supplyLimit: 100_000,
                },
                true,
            ),
            addMockCollateralAsset({
                name: "assetA18Dec",
                price: assetAPrice,
                factor: 1,
                decimals: 18,
            }),
            addMockCollateralAsset({
                name: "assetA8Dec",
                price: assetAPrice,
                factor: 0.8,
                decimals: 8, // eg USDT
            }),
        ]);
        await assetAAsset.setBalance(depositor, amountA18Dec);
        await assetAAsset.contract.connect(depositor).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        await assetAAsset8Dec.setBalance(depositor, depositAmount8Dec);
        await assetAAsset8Dec.contract.connect(depositor).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        for (const user of users) {
            await Promise.all([
                await assetAAsset.setBalance(user, amountA18Dec),
                await assetAAsset8Dec.setBalance(user, depositAmount8Dec),
                await assetAAsset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                await assetAAsset8Dec.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
            ]);
        }
    });

    let positions: Positions;
});
