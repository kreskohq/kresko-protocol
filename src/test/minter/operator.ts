import hre from "hardhat";
import { toFixedPoint } from "@utils/fixed-point";
import { expect } from "@test/chai";

import {
    withFixture,
    addMockCollateralAsset,
    addMockKreskoAsset,
    getMockOracleFor,
    defaultCollateralArgs,
    defaultKrAssetArgs,
    getNewMinterParams,
} from "@utils/test";

describe("Minter", function () {
    let users: Users;
    let addr: Addresses;
    withFixture("createMinter");
    beforeEach(async function () {
        users = hre.users;
        addr = hre.addr;
    });
    describe("#operator", () => {
        it("can modify all parameters", async function () {
            const Diamond = hre.Diamond.connect(users.operator);
            const update = getNewMinterParams(addr.operator);
            await expect(Diamond.updateBurnFee(update.burnFee)).to.not.be.reverted;
            await expect(Diamond.updateLiquidationIncentiveMultiplier(update.liquidationIncentiveMultiplier)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumCollateralizationRatio(update.minimumCollateralizationRatio)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumDebtValue(update.minimumDebtValue)).to.not.be.reverted;
            await expect(Diamond.updateSecondsUntilStalePrice(update.secondsUntilStalePrice)).to.not.be.reverted;
            await expect(Diamond.updateFeeRecipient(update.feeRecipient)).to.not.be.reverted;

            const {
                burnfee,
                liquidationIncentiveMultiplier,
                minimumCollateralizationRatio,
                minimumDebtValue,
                secondsUntilStalePrice,
                feeRecipient,
            } = await hre.Diamond.getAllParams();

            expect(update.burnFee.toBigInt()).to.equal(burnfee.rawValue);
            expect(update.liquidationIncentiveMultiplier.toBigInt()).to.equal(liquidationIncentiveMultiplier.rawValue);
            expect(update.minimumCollateralizationRatio.toBigInt()).to.equal(minimumCollateralizationRatio.rawValue);
            expect(update.minimumDebtValue.toBigInt()).to.equal(minimumDebtValue.rawValue);
            expect(update.secondsUntilStalePrice).to.equal(Number(secondsUntilStalePrice));
            expect(update.feeRecipient).to.equal(feeRecipient);
        });

        it("can add a collateral asset", async function () {
            const [Collateral] = await addMockCollateralAsset(defaultCollateralArgs);
            expect(await hre.Diamond.collateralExists(Collateral.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                Collateral.address,
                hre.toBig(1),
                true,
            );

            expect(Number(oraclePrice)).to.equal(Number(toFixedPoint(defaultCollateralArgs.price)));
        });

        it("can add a kresko asset", async function () {
            const [KreskoAsset] = await addMockKreskoAsset();

            const values = await hre.Diamond.kreskoAsset(KreskoAsset.address);
            const kreskoPriceAnswer = Number(
                await hre.Diamond.getKrAssetValue(KreskoAsset.address, hre.toBig(1), true),
            );

            expect(await hre.Diamond.krAssetExists(KreskoAsset.address)).to.equal(true);
            expect(values.exists).to.equal(true);
            expect(Number(values.kFactor)).to.equal(Number(toFixedPoint(defaultKrAssetArgs.factor)));
            expect(Number(kreskoPriceAnswer)).to.equal(Number(toFixedPoint(defaultKrAssetArgs.price)));
            expect(hre.fromBig(values.supplyLimit)).to.equal(defaultKrAssetArgs.supplyLimit);
        });

        it("can update values of a kresko asset", async function () {
            const [krAsset, , Oracle] = await addMockKreskoAsset();

            const oracleAnswer = Number(await Oracle.latestAnswer());
            const kreskoAnswer = Number(await hre.Diamond.getKrAssetValue(krAsset.address, hre.toBig(1), true));

            expect(oracleAnswer).to.equal(kreskoAnswer);
            expect(oracleAnswer).to.equal(Number(toFixedPoint(defaultKrAssetArgs.price)));

            const update = {
                factor: toFixedPoint(1.2),
                supplyLimit: 12000,
                price: 20,
            };

            const updatedOracle = await getMockOracleFor(await krAsset.name(), update.price);

            await hre.Diamond.connect(users.operator).updateKreskoAsset(
                krAsset.address,
                update.factor,
                updatedOracle.address,
                false,
                hre.toBig(update.supplyLimit),
            );

            const newValues = await hre.Diamond.kreskoAsset(krAsset.address);
            const updatedOracleAnswer = Number(await updatedOracle.latestAnswer());
            const newKreskoAnswer = Number(await hre.Diamond.getKrAssetValue(krAsset.address, hre.toBig(1), true));

            expect(newValues.exists).to.equal(true);
            expect(Number(newValues.kFactor)).to.equal(Number(update.factor));
            expect(hre.fromBig(newValues.supplyLimit)).to.equal(Number(update.supplyLimit));

            expect(updatedOracleAnswer).to.equal(newKreskoAnswer);
            expect(updatedOracleAnswer).to.equal(Number(toFixedPoint(update.price)));
        });
    });
});
