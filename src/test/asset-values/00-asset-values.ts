import { toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture, wrapContractWithSigner } from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { getCR } from "@utils/test/helpers/liquidations";
import hre from "hardhat";

describe("Asset Amounts & Values", function () {
    describe("#Collateral Deposit Values", async () => {
        it("should return the correct deposit value with 18 decimals", async () => {
            const depositAmount = toBig(10);
            const expectedDepositValue = toBig(50, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset.address,
                depositAmount,
            );
            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
        it("should return the correct deposit value with less than 18 decimals", async () => {
            const depositAmount = toBig(10, 8);
            const expectedDepositValue = toBig(50, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset8Dec.address,
                depositAmount,
            );
            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
        it("should return the correct deposit value with over 18 decimals", async () => {
            const depositAmount = toBig(10, 21);
            const expectedDepositValue = toBig(50, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset21Dec.address,
                depositAmount,
            );
            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });

        it("should return the correct deposit value combination of different decimals", async () => {
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset.address,
                toBig(10),
            );
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset8Dec.address,
                toBig(10, 8),
            );
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset21Dec.address,
                toBig(10, 21),
            );
            const expectedDepositValue = toBig(150, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 30
            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
    });

    describe("#Collateral Deposit Amount", async () => {
        it("should return the correct deposit amount with 18 decimals", async () => {
            const depositAmount = toBig(10);
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset.address,
                depositAmount,
            );
            const withdrawIndex = await hre.Diamond.getDepositedCollateralAssetIndex(
                user.address,
                CollateralAsset.address,
            );
            const deposits = await hre.Diamond.collateralDeposits(user.address, CollateralAsset.address);
            expect(deposits).to.equal(depositAmount);
            await wrapContractWithSigner(hre.Diamond, user).withdrawCollateral(
                user.address,
                CollateralAsset.address,
                depositAmount,
                withdrawIndex,
            );
            const balance = await CollateralAsset.contract.balanceOf(user.address);
            expect(balance).to.equal(toBig(startingBalance));
        });

        it("should return the correct deposit amount with less than 18 decimals", async () => {
            const depositAmount = toBig(10, 8);
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset8Dec.address,
                depositAmount,
            );
            const withdrawIndex = await hre.Diamond.getDepositedCollateralAssetIndex(
                user.address,
                CollateralAsset8Dec.address,
            );
            const deposits = await hre.Diamond.collateralDeposits(user.address, CollateralAsset8Dec.address);
            expect(deposits).to.equal(depositAmount);
            await wrapContractWithSigner(hre.Diamond, user).withdrawCollateral(
                user.address,
                CollateralAsset8Dec.address,
                depositAmount,
                withdrawIndex,
            );
            const balance = await CollateralAsset8Dec.contract.balanceOf(user.address);
            expect(balance).to.equal(toBig(startingBalance, 8));
        });

        it("should return the correct deposit value with over 18 decimals", async () => {
            const depositAmount = toBig(10, 21);
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset21Dec.address,
                depositAmount,
            );
            const withdrawIndex = await hre.Diamond.getDepositedCollateralAssetIndex(
                user.address,
                CollateralAsset21Dec.address,
            );
            const deposits = await hre.Diamond.collateralDeposits(user.address, CollateralAsset21Dec.address);
            expect(deposits).to.equal(depositAmount);
            await wrapContractWithSigner(hre.Diamond, user).withdrawCollateral(
                user.address,
                CollateralAsset21Dec.address,
                depositAmount,
                withdrawIndex,
            );
            const balance = await CollateralAsset21Dec.contract.balanceOf(user.address);
            expect(balance).to.equal(toBig(startingBalance, 21));
        });
    });

    describe("#Kresko Asset Debt Values", async () => {
        it("should return the correct debt value (+CR) with 18 decimal collateral", async () => {
            const depositAmount = toBig(10);
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset.address,
                depositAmount,
            );

            const mintAmount = toBig(1);
            const expectedMintValue = toBig(20, oracleDecimals); // kFactor = 2, krAssetPrice = 10, mintAmount = 1, openFee = 0.1

            await wrapContractWithSigner(hre.Diamond, user).mintKreskoAsset(
                user.address,
                KreskoAsset.address,
                mintAmount,
            );
            const expectedDepositValue = toBig(49.5, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10, openFee = 0.1

            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);

            const mintValue = await hre.Diamond.getAccountKrAssetValue(user.address);
            expect(mintValue).to.equal(expectedMintValue);

            const assetValue = await hre.Diamond.getKrAssetValue(KreskoAsset.address, mintAmount, true);
            const kFactor = (await hre.Diamond.kreskoAsset(KreskoAsset.address)).kFactor;
            expect(assetValue).to.equal(expectedMintValue.wadDiv(kFactor));

            const collateralRatio = await getCR(user.address, true); // big
            expect(collateralRatio).to.equal(expectedDepositValue.wadDiv(expectedMintValue)); // 2.475
        });
        it("should return the correct debt value (+CR) with less than 18 decimal collateral", async () => {
            const depositAmount = toBig(10, 8);
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset8Dec.address,
                depositAmount,
            );

            const mintAmount = toBig(1);
            const expectedMintValue = toBig(20, oracleDecimals); // kFactor = 2, krAssetPrice = 10, mintAmount = 1, openFee = 0.1

            await wrapContractWithSigner(hre.Diamond, user).mintKreskoAsset(
                user.address,
                KreskoAsset.address,
                mintAmount,
            );
            const expectedDepositValue = toBig(49.5, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10, openFee = 0.1

            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);

            const mintValue = await hre.Diamond.getAccountKrAssetValue(user.address);
            expect(mintValue).to.equal(expectedMintValue);

            const assetValue = await hre.Diamond.getKrAssetValue(KreskoAsset.address, mintAmount, true);
            const kFactor = (await hre.Diamond.kreskoAsset(KreskoAsset.address)).kFactor;
            expect(assetValue).to.equal(expectedMintValue.wadDiv(kFactor));

            const collateralRatio = await getCR(user.address, true); // big
            expect(collateralRatio).to.equal(expectedDepositValue.wadDiv(expectedMintValue)); // 2.475
        });
        it("should return the correct debt value (+CR) with more than 18 decimal collateral", async () => {
            const depositAmount = toBig(10, 21);
            await wrapContractWithSigner(hre.Diamond, user).depositCollateral(
                user.address,
                CollateralAsset21Dec.address,
                depositAmount,
            );

            const mintAmount = toBig(1);
            const expectedMintValue = toBig(20, oracleDecimals); // kFactor = 2, krAssetPrice = 10, mintAmount = 1, openFee = 0.1

            await wrapContractWithSigner(hre.Diamond, user).mintKreskoAsset(
                user.address,
                KreskoAsset.address,
                mintAmount,
            );
            const expectedDepositValue = toBig(49.5, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10, openFee = 0.1

            const depositValue = await hre.Diamond.accountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);

            const mintValue = await hre.Diamond.getAccountKrAssetValue(user.address);
            expect(mintValue).to.equal(expectedMintValue);

            const assetValue = await hre.Diamond.getKrAssetValue(KreskoAsset.address, mintAmount, true);
            const kFactor = (await hre.Diamond.kreskoAsset(KreskoAsset.address)).kFactor;
            expect(assetValue).to.equal(expectedMintValue.wadDiv(kFactor));

            const collateralRatio = await getCR(user.address, true); // big
            expect(collateralRatio).to.equal(expectedDepositValue.wadDiv(expectedMintValue)); // 2.475
        });
    });

    withFixture(["minter-init"]);
    let KreskoAsset: Awaited<ReturnType<typeof addMockKreskoAsset>>;
    let CollateralAsset: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset8Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    let CollateralAsset21Dec: Awaited<ReturnType<typeof addMockCollateralAsset>>;
    const collateralPrice = 10;
    const kreskoAssetPrice = 10;
    const startingBalance = 100;
    let user: SignerWithAddress;
    let oracleDecimals: number;
    beforeEach(async function () {
        user = hre.users.testUserSeven;
        oracleDecimals = await hre.Diamond.extOracleDecimals();
        KreskoAsset = await addMockKreskoAsset({
            name: "KreskoAssetPrice10USD",
            price: collateralPrice,
            symbol: "KreskoAssetPrice10USD",
            closeFee: 0.1,
            openFee: 0.1,
            marketOpen: true,
            factor: 2,
            supplyLimit: 10,
        });
        CollateralAsset = await addMockCollateralAsset({
            name: "Collateral18Dec",
            price: kreskoAssetPrice,
            factor: 0.5,
            decimals: 18,
        });

        CollateralAsset8Dec = await addMockCollateralAsset({
            name: "Collateral8Dec",
            price: kreskoAssetPrice,
            factor: 0.5,
            decimals: 8, // eg USDT
        });
        CollateralAsset21Dec = await addMockCollateralAsset({
            name: "Collateral21Dec",
            price: kreskoAssetPrice,
            factor: 0.5,
            decimals: 21, // more
        });
        await CollateralAsset.setBalance(user, toBig(startingBalance));
        await CollateralAsset8Dec.setBalance(user, toBig(startingBalance, 8));
        await CollateralAsset21Dec.setBalance(user, toBig(startingBalance, 21));

        await CollateralAsset.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        await CollateralAsset8Dec.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
        await CollateralAsset21Dec.contract.connect(user).approve(hre.Diamond.address, hre.ethers.constants.MaxUint256);
    });
});
