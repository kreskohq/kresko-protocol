import { expect } from "@test/chai";
import { DefaultFixture, defaultFixture } from "@utils/test/fixtures";

import { addMockExtAsset } from "@utils/test/helpers/collaterals";
import { getAssetConfig, wrapContractWithSigner } from "@utils/test/helpers/general";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { getFakeOracle } from "@utils/test/helpers/oracle";
import { testCollateralConfig, testKrAssetConfig, testMinterParams } from "@utils/test/mocks";
import { fromBig, toBig } from "@utils/values";
import { KrAssetConfig } from "types";
import { AssetStruct } from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

describe("Minter - Configuration", function () {
    let f: DefaultFixture;
    this.slow(1000);

    this.beforeEach(async function () {
        f = await defaultFixture();
    });

    describe("#configuration", () => {
        it("can modify all parameters", async function () {
            const update = testMinterParams(hre.users.treasury.address);
            await expect(hre.Diamond.updateMinCollateralRatio(update.minCollateralRatio)).to.not.be.reverted;
            await expect(hre.Diamond.updateLiquidationThreshold(update.liquidationThreshold)).to.not.be.reverted;
            await expect(hre.Diamond.updateMaxLiquidationRatio(update.MLR)).to.not.be.reverted;
            // await expect(hre.Diamond.updateMinDebtValue(update.minDebtValue)).to.not.be.reverted;
            // await expect(hre.Diamond.updateFeeRecipient(update.feeRecipient)).to.not.be.reverted;
            // await expect(hre.Diamond.updateOracleDeviationPct(update.oracleDeviationPct)).to.not.be.reverted;
            const { minCollateralRatio, maxLiquidationRatio, liquidationThreshold } =
                await hre.Diamond.getMinterParameters();
            expect(update.minCollateralRatio).to.equal(minCollateralRatio);
            expect(update.MLR).to.equal(maxLiquidationRatio);
            expect(update.liquidationThreshold).to.equal(liquidationThreshold);

            // expect(update.minDebtValue.toBigInt()).to.equal(minDebtValue);
            // expect(update.feeRecipient).to.equal(feeRecipient);
            // expect(update.oracleDeviationPct).to.equal(oracleDeviationPct);
        });

        it("can add a collateral asset", async function () {
            const { contract } = await addMockExtAsset(testCollateralConfig);
            expect(await hre.Diamond.getCollateralExists(contract.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralAmountToValue(contract.address, toBig(1), true);
            expect(Number(oraclePrice)).to.equal(toBig(testCollateralConfig.price!, 8));
        });

        it("can add a kresko asset", async function () {
            const { contract, assetInfo } = await addMockKreskoAsset();

            const values = await assetInfo();
            const kreskoPriceAnswer = fromBig(
                await hre.Diamond.getDebtAmountToValue(contract.address, toBig(1), true),
                8,
            );
            const config = testKrAssetConfig.krAssetConfig!;

            expect(values.isKrAsset).to.equal(true);
            expect(values.kFactor).to.equal(config.kFactor);
            expect(kreskoPriceAnswer).to.equal(testKrAssetConfig.price);
            expect(values.supplyLimit).to.equal(config.supplyLimit);
            expect(values.closeFee).to.equal(config.closeFee);
            expect(values.openFee).to.equal(config.openFee);
        });

        it("can update external oracle decimals", async function () {
            const decimals = 8;
            await hre.Diamond.updateExtOracleDecimals(decimals);
            expect(await hre.Diamond.getExtOracleDecimals()).to.equal(decimals);
        });

        it("can update max liquidation ratio", async function () {
            const currentMLM = await hre.Diamond.getMaxLiquidationRatio();
            const newMLR = 1.42e4;

            expect(currentMLM.eq(newMLR)).to.be.false;

            await expect(hre.Diamond.updateMaxLiquidationRatio(newMLR)).to.not.be.reverted;
            expect((await hre.Diamond.getMaxLiquidationRatio()).eq(newMLR)).to.be.true;
        });

        it("can update oracle deviation pct", async function () {
            const currentODPCT = await hre.Diamond.getOracleDeviationPct();
            const newODPCT = 0.03e4;

            expect(currentODPCT.eq(newODPCT)).to.be.false;

            await expect(hre.Diamond.updateOracleDeviationPct(newODPCT)).to.not.be.reverted;
            expect((await hre.Diamond.getOracleDeviationPct()).eq(newODPCT)).to.be.true;
        });

        it("can update kFactor of a kresko asset separately", async function () {
            const oldRatio = (await hre.Diamond.getAsset(f.KrAsset.address)).kFactor;
            const newRatio = 1.2e4;

            expect(oldRatio === newRatio).to.be.false;

            await expect(hre.Diamond.updateKFactor(f.KrAsset.address, newRatio)).to.not.be.reverted;
            expect((await hre.Diamond.getAsset(f.KrAsset.address)).kFactor === newRatio).to.be.true;
        });
        it("can update cFactor of a collateral asset separately", async function () {
            const oldRatio = (await hre.Diamond.getAsset(f.Collateral.address)).factor;
            const newRatio = 0.9e4;
            expect(oldRatio === newRatio).to.be.false;
            await expect(hre.Diamond.updateCollateralFactor(f.Collateral.address, newRatio)).to.not.be.reverted;
            expect((await hre.Diamond.getAsset(f.Collateral.address)).factor === newRatio).to.be.true;
        });

        it("can update values of a kresko asset", async function () {
            const oracleAnswer = fromBig((await f.KrAsset.priceFeed.latestRoundData())[1], 8);
            const kreskoAnswer = fromBig(await hre.Diamond.getDebtAmountToValue(f.KrAsset.address, toBig(1), true), 8);

            expect(oracleAnswer).to.equal(kreskoAnswer);
            expect(oracleAnswer).to.equal(testKrAssetConfig.price);

            const update: KrAssetConfig = {
                kFactor: 1.2e4,
                supplyLimit: toBig(12000),
                closeFee: 0.03e4,
                openFee: 0.03e4,
                anchor: f.KrAsset.anchor.address,
            };
            const FakeFeed = await getFakeOracle(20);
            const newConfig = await getAssetConfig(f.KrAsset.contract, {
                ...testKrAssetConfig,
                feed: FakeFeed.address,
                price: 20,
                krAssetConfig: update,
            });

            await wrapContractWithSigner(hre.Diamond, hre.users.deployer).updateAsset(
                f.KrAsset.address,
                newConfig.assetStruct,
            );

            const newValues = await hre.Diamond.getAsset(f.KrAsset.address);
            const updatedOracleAnswer = fromBig((await FakeFeed.latestRoundData())[1], 8);
            const newKreskoAnswer = fromBig(
                await hre.Diamond.getDebtAmountToValue(f.KrAsset.address, toBig(1), true),
                8,
            );

            expect(newValues.isKrAsset).to.equal(true);
            expect(newValues.kFactor).to.equal(update.kFactor);
            expect(newValues.supplyLimit).to.equal(update.supplyLimit);

            expect(updatedOracleAnswer).to.equal(newKreskoAnswer);
            expect(updatedOracleAnswer).to.equal(20);

            const update2: AssetStruct = {
                ...(await hre.Diamond.getAsset(f.KrAsset.address)),
                kFactor: 1.75e4,
                supplyLimit: toBig(12000),
                closeFee: 0.052e4,
                openFee: 0.052e4,
                isSCDPKrAsset: true,
                swapInFeeSCDP: 0.052e4,
                anchor: f.KrAsset.anchor.address,
            };

            await hre.Diamond.updateAsset(f.KrAsset.address, update2);

            const newValues2 = await hre.Diamond.getAsset(f.KrAsset.address);

            expect(newValues2.isKrAsset).to.equal(true);
            expect(newValues.kFactor).to.equal(update2.kFactor);
            expect(newValues.openFee).to.equal(update2.closeFee);
            expect(newValues.closeFee).to.equal(update2.openFee);
            expect(newValues.swapInFeeSCDP).to.equal(update2.swapInFeeSCDP);
            expect(newValues.supplyLimit).to.equal(update2.supplyLimit);
        });
    });
});
