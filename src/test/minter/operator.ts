import hre from "hardhat";
import { withFixture, addMockCollateralAsset, addMockKreskoAsset, getMockOracleFor } from "@test-utils";
import { smock } from "@defi-wonderland/smock";
import { fromBig, toBig, toFixedPoint } from "@utils";
import chai, { expect } from "chai";

chai.use(smock.matchers);

describe("Minter", function () {
    withFixture("createMinter");
    describe("#operator", () => {
        it("can modify all parameters", async function () {
            const Diamond = this.Diamond.connect(this.users.operator);
            const values = {
                burnFee: toFixedPoint(0.02),
                liquidationIncentiveMultiplier: toFixedPoint(1.05),
                minimumCollateralizationRatio: toFixedPoint(1.4),
                minimumDebtValue: toFixedPoint(20),
                secondsUntilStalePrice: 30,
                feeRecipient: this.users.deployer.address,
            };
            await expect(Diamond.updateBurnFee(values.burnFee)).to.not.be.reverted;
            await expect(Diamond.updateLiquidationIncentiveMultiplier(values.liquidationIncentiveMultiplier)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumCollateralizationRatio(values.minimumCollateralizationRatio)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumDebtValue(values.minimumDebtValue)).to.not.be.reverted;
            await expect(Diamond.updateSecondsUntilStalePrice(values.secondsUntilStalePrice)).to.not.be.reverted;
            await expect(Diamond.updateFeeRecipient(values.feeRecipient)).to.not.be.reverted;

            const {
                burnfee,
                liquidationIncentiveMultiplier,
                minimumCollateralizationRatio,
                minimumDebtValue,
                secondsUntilStalePrice,
                feeRecipient,
            } = await this.Diamond.getAllParams();

            expect(values.burnFee.toBigInt()).to.equal(burnfee.rawValue);
            expect(values.liquidationIncentiveMultiplier.toBigInt()).to.equal(liquidationIncentiveMultiplier.rawValue);
            expect(values.minimumCollateralizationRatio.toBigInt()).to.equal(minimumCollateralizationRatio.rawValue);
            expect(values.minimumDebtValue.toBigInt()).to.equal(minimumDebtValue.rawValue);
            expect(values.secondsUntilStalePrice).to.equal(Number(secondsUntilStalePrice));
            expect(values.feeRecipient).to.equal(feeRecipient);
        });

        it("can add a collateral asset", async function () {
            const args = {
                name: "Collateral",
                price: 5,
                factor: 0.9,
                decimals: 18,
            };
            const [Collateral] = await addMockCollateralAsset(args);
            expect(await hre.Diamond.collateralExists(Collateral.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                Collateral.address,
                toBig(1),
                true,
            );

            expect(Number(oraclePrice)).to.equal(Number(toFixedPoint(args.price)));
        });

        it("can add a kresko asset", async function () {
            const args = {
                name: "krAsset",
                price: 5,
                factor: 1.1,
                supplyLimit: 10000,
            };
            const [krAsset] = await addMockKreskoAsset(args);

            const values = await hre.Diamond.kreskoAsset(krAsset.address);
            const kreskoPriceAnswer = Number(await hre.Diamond.getKrAssetValue(krAsset.address, toBig(1), true));

            expect(await hre.Diamond.krAssetExists(krAsset.address)).to.equal(true);
            expect(values.exists).to.equal(true);
            expect(Number(values.kFactor)).to.equal(Number(toFixedPoint(args.factor)));
            expect(Number(kreskoPriceAnswer)).to.equal(Number(toFixedPoint(args.price)));
            expect(fromBig(values.supplyLimit)).to.equal(args.supplyLimit);
        });

        it("can update values of a kresko asset", async function () {
            const args = {
                name: "krAsset",
                price: 5,
                factor: 1.1,
                supplyLimit: 10000,
            };

            const [krAsset, , Oracle] = await addMockKreskoAsset(args);

            const oracleAnswer = Number(await Oracle.latestAnswer());
            const kreskoAnswer = Number(await hre.Diamond.getKrAssetValue(krAsset.address, toBig(1), true));

            expect(oracleAnswer).to.equal(kreskoAnswer);
            expect(oracleAnswer).to.equal(Number(toFixedPoint(args.price)));

            const updated = {
                factor: toFixedPoint(1.2),
                supplyLimit: 12000,
                price: 20,
            };

            const updatedOracle = await getMockOracleFor(await krAsset.name(), updated.price);

            await hre.Diamond.connect(this.users.operator).updateKreskoAsset(
                krAsset.address,
                updated.factor,
                updatedOracle.address,
                false,
                toBig(updated.supplyLimit),
            );

            const newValues = await hre.Diamond.kreskoAsset(krAsset.address);
            const updatedOracleAnswer = Number(await updatedOracle.latestAnswer());
            const newKreskoAnswer = Number(await hre.Diamond.getKrAssetValue(krAsset.address, toBig(1), true));

            expect(newValues.exists).to.equal(true);
            expect(Number(newValues.kFactor)).to.equal(Number(updated.factor));
            expect(fromBig(newValues.supplyLimit)).to.equal(Number(updated.supplyLimit));

            expect(updatedOracleAnswer).to.equal(newKreskoAnswer);
            expect(updatedOracleAnswer).to.equal(Number(toFixedPoint(updated.price)));
        });
    });
});
