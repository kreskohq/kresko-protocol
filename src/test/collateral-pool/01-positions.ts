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
            expect(await krETH.contract.balanceOf(positions.address)).to.equal(position.borrowAmountMin);
            expect(await KISS.contract.balanceOf(positions.address)).to.equal(0);
            expect(await KISS.contract.balanceOf(hre.Diamond.address)).to.equal(expectedKissBalance); // 1764

            const positionNFT0 = await positions.getPosition(0);
            expect(positionNFT0.leverage).to.equal(toBig(2));
            expect(positionNFT0.collateral).to.equal(KISS.address);
            expect(positionNFT0.borrowed).to.equal(krETH.address);
            expect(positionNFT0.account).to.equal(users[1].address);
            expect(positionNFT0.creationTimestamp).to.be.equal(timestamp0);
            expect(positionNFT0.lastUpdateTimestamp).to.be.equal(timestamp0);
            expect(positionNFT0.collateralAmount).to.equal(expectedKissBalance);
            expect(positionNFT0.borrowedAmount).to.equal(position.borrowAmountMin);
            expect(positionNFT0.nonce).to.equal(0);

            const newLeverage = toBig(3);
            const totalFeePct = toBig(0.01).wadMul(newLeverage);
            const borrowAmountWithoutFees = toBig(1).wadMul(newLeverage);
            const fees = borrowAmountWithoutFees.wadMul(totalFeePct);
            await PositionsUser.createPosition({
                ...position,
                leverage: newLeverage,
                borrowAmountMin: borrowAmountWithoutFees.sub(fees),
            });
            const timestamp1 = await getBlockTimestamp();

            const expectedTotalBorrows = BigNumber.from(position.borrowAmountMin).add(
                borrowAmountWithoutFees.sub(fees),
            );
            const expectedKissBalance2 = toBig(ETHPrice).sub(toBig(ETHPrice).wadMul(totalFeePct));
            expect(await krETH.contract.balanceOf(positions.address)).to.equal(expectedTotalBorrows);
            expect(await KISS.contract.balanceOf(positions.address)).to.equal(0);
            expect(await KISS.contract.balanceOf(hre.Diamond.address)).to.equal(
                expectedKissBalance.add(expectedKissBalance2),
            ); // 1764

            const positionNFT1 = await positions.getPosition(1);
            expect(positionNFT1.leverage).to.equal(newLeverage);
            expect(positionNFT1.collateral).to.equal(KISS.address);
            expect(positionNFT1.borrowed).to.equal(krETH.address);
            expect(positionNFT1.account).to.equal(users[1].address);
            expect(positionNFT1.creationTimestamp).to.be.equal(timestamp1);
            expect(positionNFT1.lastUpdateTimestamp).to.be.equal(timestamp1);
            expect(positionNFT1.collateralAmount).to.equal(expectedKissBalance2);
            expect(positionNFT1.borrowedAmount).to.equal(borrowAmountWithoutFees.sub(fees));
            expect(positionNFT1.nonce).to.equal(0);
        });

        it("should increase pool debt and collateral accordingly", async () => {
            const PositionsUser = positions.connect(users[1]);
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);
            expect(poolStatsBefore.cr).to.be.eq(0);
            await expect(PositionsUser.createPosition(position)).to.not.be.reverted;
            const pos = await positions.getPosition(0);
            const poolStats = await hre.Diamond.getPoolStats(true);
            expect(poolStats.debtValue).to.equal(pos.borrowedAmount.wadMul(toBig(ETHPrice, 8)));
            expect(poolStats.cr).to.be.gt(0);
            expect(poolStats.collateralValue).to.equal(
                poolStatsBefore.collateralValue.add(fromBig(pos.collateralAmount, 10)),
            );
        });
        it("should be able to close a position", async () => {
            const PositionsUser = positions.connect(users[1]);

            expect(await KISS.contract.balanceOf(users[1].address)).to.equal(depositAmount18Dec);
            const poolStatsBefore = await hre.Diamond.getPoolStats(true);
            await PositionsUser.createPosition(position);
            await PositionsUser.closePosition(0);
            const poolStatsAfter = await hre.Diamond.getPoolStats(true);
            expect(poolStatsAfter.debtValue).to.equal(poolStatsBefore.debtValue);
            expect(poolStatsAfter.collateralValue).to.equal(poolStatsBefore.collateralValue);
            expect(poolStatsAfter.cr).to.equal(0);
            expect(await KISS.contract.balanceOf(users[1].address)).to.equal(toBig(9928.72));
        });
        it("should receive profit", async () => {
            const PositionsUser = positions.connect(users[1]);
            const balBefore = await KISS.contract.balanceOf(users[1].address);
            expect(await KISS.contract.balanceOf(users[1].address)).to.equal(depositAmount18Dec);
            await PositionsUser.createPosition({ ...position, leverage: toBig(2), borrowAmountMin: 0 });
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
        it("should incur losses", async () => {
            const PositionsUser = positions.connect(users[1]);
            const balBefore = await KISS.contract.balanceOf(users[1].address);
            await PositionsUser.createPosition({ ...position, leverage: toBig(2), borrowAmountMin: 0 });
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

        it("should offset wins by losses", async () => {
            const PositionsUser = positions.connect(users[1]);

            await PositionsUser.createPosition({ ...position, leverage: toBig(2), borrowAmountMin: 0 });

            krETH.setPrice(1600);

            await PositionsUser.closePosition(0);

            krETH.setPrice(1800);

            await PositionsUser.createPosition({ ...position, leverage: toBig(2), borrowAmountMin: 0 });

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

        beforeEach(async () => {
            depositor = hre.users.testUserOne;
            const krETHFee = toBig(0.005);
            const KISSFee = toBig(0.005);

            const leverage = toBig(2);
            const totalFeePct = krETHFee.add(KISSFee).wadMul(leverage);
            const borrowAmountWithoutFees = toBig(1).wadMul(leverage);
            const fees = borrowAmountWithoutFees.wadMul(totalFeePct);
            position = {
                account: users[1].address,
                leverage: leverage,
                collateralAsset: KISS.address,
                collateralAmount: toBig(ETHPrice), // 1 eth
                borrowAsset: krETH.address,
                borrowAmountMin: borrowAmountWithoutFees.sub(fees), // 1.96 eth
            };
            await hre.Diamond.enablePoolCollaterals(
                [CollateralAsset.address, CollateralAsset8Dec.address, KISS.address, krETH.address],
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

            await hre.Diamond.connect(depositor).poolDeposit(
                depositor.address,
                CollateralAsset.address,
                depositAmount18Dec,
            );

            await KISS.setBalance(users[1], depositAmount18Dec);
            await KISS.contract.connect(users[1]).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        });
    });

    withFixture(["minter-init"]);

    let KISS: Awaited<ReturnType<typeof addMockKreskoAsset>>;
    let krETH: Awaited<ReturnType<typeof addMockKreskoAsset>>;

    let CollateralAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;

    const collateralPrice = 10;
    const KISSPrice = 1;
    const ETHPrice = 1800;

    let depositor: SignerWithAddress;
    let users: SignerWithAddress[];

    const depositAmount = 10000;
    const depositAmount18Dec = toBig(depositAmount);
    const depositAmount8Dec = toBig(depositAmount, 8);
    beforeEach(async () => {
        depositor = hre.users.testUserOne;
        users = [hre.users.testUserFive, hre.users.testUserSix];
        positions = await hre.getContractOrFork("Positions");

        [KISS, krETH, CollateralAsset, CollateralAsset8Dec] = await Promise.all([
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
                name: "Collateral18Dec",
                price: collateralPrice,
                factor: 1,
                decimals: 18,
            }),
            addMockCollateralAsset({
                name: "Collateral8Dec",
                price: collateralPrice,
                factor: 0.8,
                decimals: 8, // eg USDT
            }),
        ]);
        await CollateralAsset.setBalance(depositor, depositAmount18Dec);
        await CollateralAsset.contract.connect(depositor).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        await CollateralAsset8Dec.setBalance(depositor, depositAmount8Dec);
        await CollateralAsset8Dec.contract
            .connect(depositor)
            .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        for (const user of users) {
            await Promise.all([
                await CollateralAsset.setBalance(user, depositAmount18Dec),
                await CollateralAsset8Dec.setBalance(user, depositAmount8Dec),
                await CollateralAsset.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
                await CollateralAsset8Dec.contract
                    .connect(user)
                    .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256),
            ]);
        }
    });

    let positions: Positions;
});
