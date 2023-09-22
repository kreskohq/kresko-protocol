import { fromBig, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import {
    defaultCollateralArgs,
    defaultKrAssetArgs,
    getNewMinterParams,
    withFixture,
    wrapContractWithSigner,
} from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, getKrAssetConfig } from "@utils/test/helpers/krassets";
import { getMockOracles } from "@utils/test/helpers/oracle";
import { OracleType } from "@utils/test/oracles";

describe("Minter - Configuration", () => {
    withFixture(["minter-init"]);

    describe("#configuration", () => {
        it("can modify all parameters", async function () {
            const Diamond = wrapContractWithSigner(hre.Diamond, hre.users.deployer);
            const update = getNewMinterParams(hre.users.treasury.address);
            await expect(Diamond.updateMinCollateralRatio(update.minCollateralRatio)).to.not.be.reverted;
            await expect(Diamond.updateMinDebtValue(update.minDebtValue)).to.not.be.reverted;
            await expect(Diamond.updateLiquidationThreshold(update.liquidationThreshold)).to.not.be.reverted;
            await expect(Diamond.updateFeeRecipient(update.feeRecipient)).to.not.be.reverted;
            await expect(hre.Diamond.updateMaxLiquidationMultiplier(update.MLM)).to.not.be.reverted;
            await expect(hre.Diamond.updateOracleDeviationPct(update.oracleDeviationPct)).to.not.be.reverted;
            const { minCollateralRatio, minDebtValue, feeRecipient, oracleDeviationPct } =
                await hre.Diamond.getCurrentParameters();

            expect(update.minCollateralRatio.toBigInt()).to.equal(minCollateralRatio);
            expect(update.minDebtValue.toBigInt()).to.equal(minDebtValue);
            expect(update.feeRecipient).to.equal(feeRecipient);
            expect(update.oracleDeviationPct).to.equal(oracleDeviationPct);
        });

        it("can add a collateral asset", async function () {
            const { contract } = await addMockCollateralAsset(defaultCollateralArgs);
            expect(await hre.Diamond.getCollateralExists(contract.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralAmountToValue(contract.address, toBig(1), true);

            expect(Number(oraclePrice)).to.equal(toBig(defaultCollateralArgs.price, 8));
        });

        it("can add a kresko asset", async function () {
            const { contract, kresko } = await addMockKreskoAsset();

            const values = await kresko();
            const kreskoPriceAnswer = fromBig(
                await hre.Diamond.getDebtAmountToValue(contract.address, toBig(1), true),
                8,
            );

            expect(await hre.Diamond.getKrAssetExists(contract.address)).to.equal(true);
            expect(values.exists).to.equal(true);
            expect(values.kFactor).to.equal(toBig(defaultKrAssetArgs.factor));
            expect(kreskoPriceAnswer).to.equal(defaultKrAssetArgs.price);
            expect(fromBig(values.supplyLimit)).to.equal(defaultKrAssetArgs.supplyLimit);
            expect(fromBig(values.closeFee)).to.equal(defaultKrAssetArgs.closeFee);
            expect(fromBig(values.openFee)).to.equal(defaultKrAssetArgs.openFee);
        });

        it("can update external oracle decimals", async function () {
            const decimals = 8;
            await hre.Diamond.updateExtOracleDecimals(decimals);
            expect(await hre.Diamond.getExtOracleDecimals()).to.equal(decimals);
        });

        it("can update max liquidatable multiplier", async function () {
            const currentMLM = await hre.Diamond.getMaxLiquidationMultiplier();
            const newMLM = toBig(1.0002);

            expect(currentMLM.eq(newMLM)).to.be.false;

            await expect(hre.Diamond.updateMaxLiquidationMultiplier(newMLM)).to.not.be.reverted;
            expect((await hre.Diamond.getMaxLiquidationMultiplier()).eq(newMLM)).to.be.true;
        });

        it("can update oracle deviation pct", async function () {
            const currentODPCT = await hre.Diamond.getOracleDeviationPct();
            const newODPCT = toBig(0.3);

            expect(currentODPCT.eq(newODPCT)).to.be.false;

            await expect(hre.Diamond.updateOracleDeviationPct(newODPCT)).to.not.be.reverted;
            expect((await hre.Diamond.getOracleDeviationPct()).eq(newODPCT)).to.be.true;
        });

        it("can update kFactor of a kresko asset separately", async function () {
            const { contract } = await addMockKreskoAsset();
            const oldRatio = (await hre.Diamond.getKreskoAsset(contract.address)).kFactor;
            const newRatio = toBig(1.2);

            expect(oldRatio.eq(newRatio)).to.be.false;

            await expect(hre.Diamond.updateKFactor(contract.address, newRatio)).to.not.be.reverted;
            expect((await hre.Diamond.getKreskoAsset(contract.address)).kFactor.eq(newRatio)).to.be.true;
        });
        it("can update cFactor of a collateral asset separately", async function () {
            const { contract } = await addMockCollateralAsset();
            const oldRatio = (await hre.Diamond.getCollateralAsset(contract.address)).factor;
            const newRatio = toBig(0.9);

            expect(oldRatio.eq(newRatio)).to.be.false;

            await expect(hre.Diamond.updateCollateralFactor(contract.address, newRatio)).to.not.be.reverted;
            expect((await hre.Diamond.getCollateralAsset(contract.address)).factor.eq(newRatio)).to.be.true;
        });

        it("can update values of a kresko asset", async function () {
            const { contract, anchor, priceFeed } = await addMockKreskoAsset();

            const oracleAnswer = fromBig((await priceFeed.latestRoundData())[1], 8);
            const kreskoAnswer = fromBig(await hre.Diamond.getDebtAmountToValue(contract.address, toBig(1), true), 8);

            expect(oracleAnswer).to.equal(kreskoAnswer);
            expect(oracleAnswer).to.equal(defaultKrAssetArgs.price);

            const update = {
                factor: toBig(1.2),
                supplyLimit: 12000,
                price: 20,
                closeFee: toBig(0.02),
                openFee: toBig(0.02),
            };

            const [MockFeed] = await getMockOracles(update.price);

            await wrapContractWithSigner(hre.Diamond, hre.users.deployer).updateKreskoAsset(
                contract.address,
                ...(await getKrAssetConfig(
                    contract,
                    anchor!.address,
                    update.factor,
                    toBig(update.supplyLimit),
                    update.closeFee,
                    update.openFee,
                    MockFeed.address,
                    "MockKreskoAsset",
                    [OracleType.Chainlink, OracleType.Redstone],
                )),
            );

            const newValues = await hre.Diamond.getKreskoAsset(contract.address);
            const updatedOracleAnswer = fromBig((await MockFeed.latestRoundData())[1], 8);
            const newKreskoAnswer = fromBig(
                await hre.Diamond.getDebtAmountToValue(contract.address, toBig(1), true),
                8,
            );

            expect(newValues.exists).to.equal(true);
            expect(Number(newValues.kFactor)).to.equal(Number(update.factor));
            expect(fromBig(newValues.supplyLimit)).to.equal(update.supplyLimit);

            expect(updatedOracleAnswer).to.equal(newKreskoAnswer);
            expect(updatedOracleAnswer).to.equal(update.price);
        });
    });
});
