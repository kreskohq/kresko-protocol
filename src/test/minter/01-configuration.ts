import { smock } from "@defi-wonderland/smock";
import { toFixedPoint } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import {
    defaultCollateralArgs,
    defaultKrAssetArgs,
    getMockOracleFor,
    getNewMinterParams,
    withFixture,
} from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import hre from "hardhat";
import { UniswapV2Oracle } from "types";

describe("Minter - Configuration", () => {
    withFixture(["minter-init"]);

    describe("#configuration", () => {
        it("can modify all parameters", async function () {
            const Diamond = hre.Diamond.connect(hre.users.operator);
            const update = getNewMinterParams(hre.users.operator.address);
            await expect(Diamond.updateLiquidationIncentiveMultiplier(update.liquidationIncentiveMultiplier)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumCollateralizationRatio(update.minimumCollateralizationRatio)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumDebtValue(update.minimumDebtValue)).to.not.be.reverted;
            await expect(Diamond.updateLiquidationThreshold(update.liquidationThreshold)).to.not.be.reverted;
            await expect(Diamond.updateFeeRecipient(update.feeRecipient)).to.not.be.reverted;
            const {
                liquidationIncentiveMultiplier,
                minimumCollateralizationRatio,
                minimumDebtValue,
                liquidationThreshold,
                feeRecipient,
            } = await hre.Diamond.getAllParams();

            expect(update.liquidationIncentiveMultiplier.toBigInt()).to.equal(liquidationIncentiveMultiplier.rawValue);
            expect(update.minimumCollateralizationRatio.toBigInt()).to.equal(minimumCollateralizationRatio.rawValue);
            expect(update.minimumDebtValue.toBigInt()).to.equal(minimumDebtValue.rawValue);
            expect(update.liquidationThreshold.toBigInt()).to.equal(liquidationThreshold.rawValue);
            expect(update.feeRecipient).to.equal(feeRecipient);
        });

        it("can add a collateral asset", async function () {
            const { contract } = await addMockCollateralAsset(defaultCollateralArgs);
            expect(await hre.Diamond.collateralExists(contract.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                contract.address,
                hre.toBig(1),
                true,
            );

            expect(Number(oraclePrice)).to.equal(hre.toBig(defaultCollateralArgs.price, 8));
        });

        it("can add a kresko asset", async function () {
            const { contract, kresko } = await addMockKreskoAsset();

            const values = await kresko();
            const kreskoPriceAnswer = hre.fromBig(
                (await hre.Diamond.getKrAssetValue(contract.address, hre.toBig(1), true)).rawValue,
                8,
            );

            expect(await hre.Diamond.krAssetExists(contract.address)).to.equal(true);
            expect(values.exists).to.equal(true);
            expect(Number(values.kFactor)).to.equal(Number(toFixedPoint(defaultKrAssetArgs.factor)));
            expect(kreskoPriceAnswer).to.equal(defaultKrAssetArgs.price);
            expect(hre.fromBig(values.supplyLimit)).to.equal(defaultKrAssetArgs.supplyLimit);
            expect(hre.fromBig(values.closeFee.rawValue)).to.equal(defaultKrAssetArgs.closeFee);
            expect(hre.fromBig(values.openFee.rawValue)).to.equal(defaultKrAssetArgs.openFee);
        });

        it("can update AMM oracle", async function () {
            const ammOracle = await smock.fake<UniswapV2Oracle>("UniswapV2Oracle");
            await hre.Diamond.updateAMMOracle(ammOracle.address);
            expect(await hre.Diamond.ammOracle()).to.equal(ammOracle.address);
        });

        it("can update external oracle decimals", async function () {
            const decimals = 8;
            await hre.Diamond.updateExtOracleDecimals(decimals);
            expect(await hre.Diamond.extOracleDecimals()).to.equal(decimals);
        });

        it("can update values of a kresko asset", async function () {
            const { contract, anchor, priceFeed } = await addMockKreskoAsset();

            const oracleAnswer = hre.fromBig(await priceFeed.latestAnswer(), 8);
            const kreskoAnswer = hre.fromBig(
                (await hre.Diamond.getKrAssetValue(contract.address, hre.toBig(1), true)).rawValue,
                8,
            );

            expect(oracleAnswer).to.equal(kreskoAnswer);
            expect(oracleAnswer).to.equal(defaultKrAssetArgs.price);

            const update = {
                factor: toFixedPoint(1.2),
                supplyLimit: 12000,
                price: 20,
                closeFee: toFixedPoint(0.02),
                openFee: toFixedPoint(0.02),
            };

            const [newPriceFeed] = await getMockOracleFor(await contract.name(), update.price);

            await hre.Diamond.connect(hre.users.operator).updateKreskoAsset(
                contract.address,
                anchor!.address,
                update.factor,
                newPriceFeed.address,
                newPriceFeed.address,
                hre.toBig(update.supplyLimit),
                update.closeFee,
                update.openFee,
            );

            const newValues = await hre.Diamond.kreskoAsset(contract.address);
            const updatedOracleAnswer = hre.fromBig(await newPriceFeed.latestAnswer(), 8);
            const newKreskoAnswer = hre.fromBig(
                (await hre.Diamond.getKrAssetValue(contract.address, hre.toBig(1), true)).rawValue,
                8,
            );

            expect(newValues.exists).to.equal(true);
            expect(Number(newValues.kFactor)).to.equal(Number(update.factor));
            expect(hre.fromBig(newValues.supplyLimit)).to.equal(update.supplyLimit);

            expect(updatedOracleAnswer).to.equal(newKreskoAnswer);
            expect(updatedOracleAnswer).to.equal(update.price);
        });
    });
});
