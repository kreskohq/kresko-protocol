import { toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { wrapKresko } from "@utils/redstone";
import { AssetValuesFixture, assetValuesFixture } from "@utils/test";
import { getCR } from "@utils/test/helpers/liquidations";
import optimizations from "@utils/test/helpers/optimizations";
import { Kresko } from "types/typechain";

describe("Asset Amounts & Values", function () {
    let f: AssetValuesFixture;
    let User: Kresko;
    beforeEach(async function () {
        f = await assetValuesFixture();
        f.user = hre.users.testUserSeven;
        User = wrapKresko(hre.Diamond, f.user);
    });
    describe("#Collateral Deposit Values", async () => {
        it("should return the correct deposit value with 18 decimals", async () => {
            const depositAmount = toBig(10);
            const expectedDepositValue = toBig(50, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await User.depositCollateral(f.user.address, f.CollateralAsset.address, depositAmount);
            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
        it("should return the correct deposit value with less than 18 decimals", async () => {
            const depositAmount = toBig(10, 8);
            const expectedDepositValue = toBig(50, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await User.depositCollateral(f.user.address, f.CollateralAsset8Dec.address, depositAmount);
            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
        it("should return the correct deposit value with over 18 decimals", async () => {
            const depositAmount = toBig(10, 21);
            const expectedDepositValue = toBig(50, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await User.depositCollateral(f.user.address, f.CollateralAsset21Dec.address, depositAmount);
            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });

        it("should return the correct deposit value combination of different decimals", async () => {
            await User.depositCollateral(f.user.address, f.CollateralAsset.address, toBig(10));
            await User.depositCollateral(f.user.address, f.CollateralAsset8Dec.address, toBig(10, 8));
            await User.depositCollateral(f.user.address, f.CollateralAsset21Dec.address, toBig(10, 21));
            const expectedDepositValue = toBig(150, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 30
            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
    });

    describe("#Collateral Deposit Amount", async () => {
        it("should return the correct deposit amount with 18 decimals", async () => {
            const depositAmount = toBig(10);
            await User.depositCollateral(f.user.address, f.CollateralAsset.address, depositAmount);
            const withdrawIndex = await optimizations.getAccountDepositIndex(f.user.address, f.CollateralAsset.address);
            const deposits = await hre.Diamond.getAccountCollateralAmount(f.user.address, f.CollateralAsset.address);
            expect(deposits).to.equal(depositAmount);
            await User.withdrawCollateral(f.user.address, f.CollateralAsset.address, depositAmount, withdrawIndex);
            const balance = await f.CollateralAsset.balanceOf(f.user.address);
            expect(balance).to.equal(toBig(f.startingBalance));
        });

        it("should return the correct deposit amount with less than 18 decimals", async () => {
            const depositAmount = toBig(10, 8);
            await User.depositCollateral(f.user.address, f.CollateralAsset8Dec.address, depositAmount);
            const withdrawIndex = await optimizations.getAccountDepositIndex(
                f.user.address,
                f.CollateralAsset8Dec.address,
            );
            const deposits = await hre.Diamond.getAccountCollateralAmount(
                f.user.address,
                f.CollateralAsset8Dec.address,
            );
            expect(deposits).to.equal(depositAmount);
            await User.withdrawCollateral(f.user.address, f.CollateralAsset8Dec.address, depositAmount, withdrawIndex);
            const balance = await f.CollateralAsset8Dec.balanceOf(f.user.address);
            expect(balance).to.equal(toBig(f.startingBalance, 8));
        });

        it("should return the correct deposit value with over 18 decimals", async () => {
            const depositAmount = toBig(10, 21);
            await User.depositCollateral(f.user.address, f.CollateralAsset21Dec.address, depositAmount);
            const withdrawIndex = await optimizations.getAccountDepositIndex(
                f.user.address,
                f.CollateralAsset21Dec.address,
            );
            const deposits = await hre.Diamond.getAccountCollateralAmount(
                f.user.address,
                f.CollateralAsset21Dec.address,
            );
            expect(deposits).to.equal(depositAmount);
            await User.withdrawCollateral(f.user.address, f.CollateralAsset21Dec.address, depositAmount, withdrawIndex);
            const balance = await f.CollateralAsset21Dec.balanceOf(f.user.address);
            expect(balance).to.equal(toBig(f.startingBalance, 21));
        });
    });

    describe("#Kresko Asset Debt Values", async () => {
        it("should return the correct debt value (+CR) with 18 decimal collateral", async () => {
            const depositAmount = toBig(10);
            await User.depositCollateral(f.user.address, f.CollateralAsset.address, depositAmount);

            const mintAmount = toBig(1);
            const expectedMintValue = toBig(20, f.extOracleDecimals); // kFactor = 2, krAssetPrice = 10, mintAmount = 1, openFee = 0.1

            await User.mintKreskoAsset(f.user.address, f.KreskoAsset.address, mintAmount);
            const expectedDepositValue = toBig(49.5, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10, openFee = 0.1

            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);

            const mintValue = await hre.Diamond.getAccountDebtValue(f.user.address);
            expect(mintValue).to.equal(expectedMintValue);

            const assetValue = await hre.Diamond.getDebtAmountToValue(f.KreskoAsset.address, mintAmount, true);
            const kFactor = (await hre.Diamond.getKreskoAsset(f.KreskoAsset.address)).kFactor;
            expect(assetValue).to.equal(expectedMintValue.wadDiv(kFactor));

            const collateralRatio = await getCR(f.user.address, true); // big
            expect(collateralRatio).to.equal(expectedDepositValue.wadDiv(expectedMintValue)); // 2.475
        });
        it("should return the correct debt value (+CR) with less than 18 decimal collateral", async () => {
            const depositAmount = toBig(10, 8);
            await User.depositCollateral(f.user.address, f.CollateralAsset8Dec.address, depositAmount);

            const mintAmount = toBig(1);
            const expectedMintValue = toBig(20, f.extOracleDecimals); // kFactor = 2, krAssetPrice = 10, mintAmount = 1, openFee = 0.1

            await User.mintKreskoAsset(f.user.address, f.KreskoAsset.address, mintAmount);
            const expectedDepositValue = toBig(49.5, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10, openFee = 0.1

            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);

            const mintValue = await hre.Diamond.getAccountDebtValue(f.user.address);
            expect(mintValue).to.equal(expectedMintValue);

            const assetValue = await hre.Diamond.getDebtAmountToValue(f.KreskoAsset.address, mintAmount, true);
            const kFactor = (await hre.Diamond.getKreskoAsset(f.KreskoAsset.address)).kFactor;
            expect(assetValue).to.equal(expectedMintValue.wadDiv(kFactor));

            const collateralRatio = await getCR(f.user.address, true); // big
            expect(collateralRatio).to.equal(expectedDepositValue.wadDiv(expectedMintValue)); // 2.475
        });
        it("should return the correct debt value (+CR) with more than 18 decimal collateral", async () => {
            const depositAmount = toBig(10, 21);
            await User.depositCollateral(f.user.address, f.CollateralAsset21Dec.address, depositAmount);

            const mintAmount = toBig(1);
            const expectedMintValue = toBig(20, f.extOracleDecimals); // kFactor = 2, krAssetPrice = 10, mintAmount = 1, openFee = 0.1

            await User.mintKreskoAsset(f.user.address, f.KreskoAsset.address, mintAmount);
            const expectedDepositValue = toBig(49.5, f.extOracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10, openFee = 0.1

            const depositValue = await hre.Diamond.getAccountCollateralValue(f.user.address);
            expect(depositValue).to.equal(expectedDepositValue);

            const mintValue = await hre.Diamond.getAccountDebtValue(f.user.address);
            expect(mintValue).to.equal(expectedMintValue);

            const assetValue = await hre.Diamond.getDebtAmountToValue(f.KreskoAsset.address, mintAmount, true);
            const kFactor = (await hre.Diamond.getKreskoAsset(f.KreskoAsset.address)).kFactor;
            expect(assetValue).to.equal(expectedMintValue.wadDiv(kFactor));

            const collateralRatio = await getCR(f.user.address, true); // big
            expect(collateralRatio).to.equal(expectedDepositValue.wadDiv(expectedMintValue)); // 2.475
        });
    });
});
