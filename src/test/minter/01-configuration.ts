import { smock } from "@defi-wonderland/smock";
import { fromBig, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { defaultCollateralArgs, defaultKrAssetArgs, getNewMinterParams, withFixture } from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, getKrAssetConfig } from "@utils/test/helpers/krassets";
import { getMockOracleFor } from "@utils/test/helpers/oracle";

describe("Minter - Configuration", () => {
    withFixture(["minter-init"]);

    describe("#configuration", () => {
        it("can modify all parameters", async function () {
            const Diamond = hre.Diamond.connect(hre.users.deployer);
            const update = getNewMinterParams(hre.users.treasury.address);
            await expect(Diamond.updateMinimumCollateralizationRatio(update.minimumCollateralizationRatio)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumDebtValue(update.minimumDebtValue)).to.not.be.reverted;
            await expect(Diamond.updateLiquidationThreshold(update.liquidationThreshold)).to.not.be.reverted;
            await expect(Diamond.updateFeeRecipient(update.feeRecipient)).to.not.be.reverted;
            await expect(hre.Diamond.updateMaxLiquidationMultiplier(update.MLM)).to.not.be.reverted;
            const { minimumCollateralizationRatio, minimumDebtValue, feeRecipient } = await hre.Diamond.getAllParams();

            expect(update.minimumCollateralizationRatio.toBigInt()).to.equal(minimumCollateralizationRatio);
            expect(update.minimumDebtValue.toBigInt()).to.equal(minimumDebtValue);
            expect(update.feeRecipient).to.equal(feeRecipient);
        });

        it("can add a collateral asset", async function () {
            const { contract } = await addMockCollateralAsset(defaultCollateralArgs);
            expect(await hre.Diamond.collateralExists(contract.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                contract.address,
                toBig(1),
                true,
            );

            expect(Number(oraclePrice)).to.equal(toBig(defaultCollateralArgs.price, 8));
        });

        it("can add a kresko asset", async function () {
            const { contract, kresko } = await addMockKreskoAsset();

            const values = await kresko();
            const kreskoPriceAnswer = fromBig(await hre.Diamond.getKrAssetValue(contract.address, toBig(1), true), 8);

            expect(await hre.Diamond.krAssetExists(contract.address)).to.equal(true);
            expect(values.exists).to.equal(true);
            expect(values.kFactor).to.equal(toBig(defaultKrAssetArgs.factor));
            expect(kreskoPriceAnswer).to.equal(defaultKrAssetArgs.price);
            expect(fromBig(values.supplyLimit)).to.equal(defaultKrAssetArgs.supplyLimit);
            expect(fromBig(values.closeFee)).to.equal(defaultKrAssetArgs.closeFee);
            expect(fromBig(values.openFee)).to.equal(defaultKrAssetArgs.openFee);
        });

        it("can update AMM oracle", async function () {
            const ammOracle = await smock.fake<TC["UniswapV2Oracle"]>("UniswapV2Oracle");
            await hre.Diamond.updateAMMOracle(ammOracle.address);
            expect(await hre.Diamond.ammOracle()).to.equal(ammOracle.address);
        });

        it("can update external oracle decimals", async function () {
            const decimals = 8;
            await hre.Diamond.updateExtOracleDecimals(decimals);
            expect(await hre.Diamond.extOracleDecimals()).to.equal(decimals);
        });
        it("can update max liquidatable multiplier", async function () {
            const currentMLM = await hre.Diamond.maxLiquidationMultiplier();
            const newMLM = toBig(1.0002);

            expect(currentMLM.eq(newMLM)).to.be.false;

            await expect(hre.Diamond.updateMaxLiquidationMultiplier(newMLM)).to.not.be.reverted;
            expect((await hre.Diamond.maxLiquidationMultiplier()).eq(newMLM)).to.be.true;
        });

        it("can update kFactor of a kresko asset separately", async function () {
            const { contract } = await addMockKreskoAsset();
            const oldRatio = (await hre.Diamond.kreskoAsset(contract.address)).kFactor;
            const newRatio = toBig(1.2);

            expect(oldRatio.eq(newRatio)).to.be.false;

            await expect(hre.Diamond.updateKFactor(contract.address, newRatio)).to.not.be.reverted;
            expect((await hre.Diamond.kreskoAsset(contract.address)).kFactor.eq(newRatio)).to.be.true;
        });
        it("can update cFactor of a collateral asset separately", async function () {
            const { contract } = await addMockCollateralAsset();
            const oldRatio = (await hre.Diamond.collateralAsset(contract.address)).factor;
            const newRatio = toBig(0.9);

            expect(oldRatio.eq(newRatio)).to.be.false;

            await expect(hre.Diamond.updateCFactor(contract.address, newRatio)).to.not.be.reverted;
            expect((await hre.Diamond.collateralAsset(contract.address)).factor.eq(newRatio)).to.be.true;
        });

        it("can update values of a kresko asset", async function () {
            const { contract, anchor, priceFeed } = await addMockKreskoAsset();

            const oracleAnswer = fromBig(await priceFeed.latestAnswer(), 8);
            const kreskoAnswer = fromBig(await hre.Diamond.getKrAssetValue(contract.address, toBig(1), true), 8);

            expect(oracleAnswer).to.equal(kreskoAnswer);
            expect(oracleAnswer).to.equal(defaultKrAssetArgs.price);

            const update = {
                factor: toBig(1.2),
                supplyLimit: 12000,
                price: 20,
                closeFee: toBig(0.02),
                openFee: toBig(0.02),
            };

            const [newPriceFeed] = await getMockOracleFor(await contract.name(), update.price);

            await hre.Diamond.connect(hre.users.deployer).updateKreskoAsset(
                contract.address,
                await getKrAssetConfig(
                    contract,
                    anchor!.address,
                    update.factor,
                    newPriceFeed.address,
                    newPriceFeed.address,
                    toBig(update.supplyLimit),
                    update.closeFee,
                    update.openFee,
                ),
            );

            const newValues = await hre.Diamond.kreskoAsset(contract.address);
            const updatedOracleAnswer = fromBig(await newPriceFeed.latestAnswer(), 8);
            const newKreskoAnswer = fromBig(await hre.Diamond.getKrAssetValue(contract.address, toBig(1), true), 8);

            expect(newValues.exists).to.equal(true);
            expect(Number(newValues.kFactor)).to.equal(Number(update.factor));
            expect(fromBig(newValues.supplyLimit)).to.equal(update.supplyLimit);

            expect(updatedOracleAnswer).to.equal(newKreskoAnswer);
            expect(updatedOracleAnswer).to.equal(update.price);
        });
    });
});
