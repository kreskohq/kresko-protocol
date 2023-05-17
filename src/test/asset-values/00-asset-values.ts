import { fromBig, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
// import { getCR } from "@utils/test/helpers/liquidations";
import hre from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
describe("Asset Amounts & Values", function () {
    describe("#Collateral Deposit Values AggregatorV2V3", async () => {
        it("should return the correct deposit value with 18 decimals", async () => {
            const depositAmount = toBig(10);
            const expectedDepositValue = toBig(50, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await hre.Diamond.connect(user).depositCollateral(user.address, CollateralAsset.address, depositAmount);
            const depositValue = await hre.Diamond.getAccountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
        it("should return the correct deposit value with less than 18 decimals", async () => {
            const depositAmount = toBig(10, 8);
            const expectedDepositValue = toBig(50, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await hre.Diamond.connect(user).depositCollateral(user.address, CollateralAsset8Dec.address, depositAmount);
            const depositValue = await hre.Diamond.getAccountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
        it("should return the correct deposit value with over 18 decimals", async () => {
            const depositAmount = toBig(10, 21);
            const expectedDepositValue = toBig(50, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 10
            await hre.Diamond.connect(user).depositCollateral(
                user.address,
                CollateralAsset21Dec.address,
                depositAmount,
            );
            const depositValue = await hre.Diamond.getAccountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });

        it("should return the correct deposit value combination of different decimals", async () => {
            await hre.Diamond.connect(user).depositCollateral(user.address, CollateralAsset.address, toBig(10));
            await hre.Diamond.connect(user).depositCollateral(user.address, CollateralAsset8Dec.address, toBig(10, 8));
            await hre.Diamond.connect(user).depositCollateral(
                user.address,
                CollateralAsset21Dec.address,
                toBig(10, 21),
            );
            const expectedDepositValue = toBig(150, oracleDecimals); // cfactor = 0.5, collateralPrice = 10, depositAmount = 30
            const depositValue = await hre.Diamond.getAccountCollateralValue(user.address);
            expect(depositValue).to.equal(expectedDepositValue);
        });
    });

    describe.only("#Collateral Deposit Values Redstone", async () => {
        it("should return the correct deposit value with 18 decimals", async () => {
            const MockWETH = await addMockCollateralAsset({
                name: "WETH",
                price: 1802,
                factor: 0.5,
                decimals: 18,
            });
            const MockKreskoAsset = await addMockKreskoAsset({
                name: "krETH",
                price: 1802,
                symbol: "krETH",
                closeFee: 0.1,
                openFee: 0.1,
                marketOpen: true,
                factor: 2,
                supplyLimit: 10,
            });
            const user = hre.users.testUserSeven;
            await MockWETH.setBalance(user, toBig(10, 18));
            await MockWETH.contract.connect(user).approve(hre.Diamond.address, toBig(100000, 18));
            await hre.Diamond.connect(user).depositCollateral(user.address, MockWETH.address, toBig(10, 18));

            const wrapped = WrapperBuilder.wrap(hre.Diamond.connect(user)).usingDataService(
                {
                    dataServiceId: "redstone-avalanche-prod",
                    dataFeeds: ["ETH"],
                    uniqueSignersCount: 1,
                },
                ["https://oracle-gateway-1.a.redstone.finance", "https://oracle-gateway-2.a.redstone.finance"],
            ); // works

            await hre.Diamond.connect(user).mintKreskoAsset(user.address, MockKreskoAsset.address, toBig(0.1, 18));
            const mintNormal = await hre.Diamond.connect(user).mintKreskoAsset(
                user.address,
                MockKreskoAsset.address,
                toBig(0.1, 18),
            );
            const mintRedstone = await wrapped.mintKreskoAssetRedstone(
                user.address,
                MockKreskoAsset.address,
                toBig(0.1, 18),
            );

            console.log("Gas used normal (mint)", (await mintNormal.wait()).gasUsed.toString());
            console.log("Gas used redstone (mint)", (await mintRedstone.wait()).gasUsed.toString());

            const withdrawNormal = await hre.Diamond.connect(user).withdrawCollateral(
                user.address,
                MockWETH.address,
                toBig(3, 18),
                0,
            );
            const withdrawRedstone = await wrapped.withdrawCollateralRedstone(
                user.address,
                MockWETH.address,
                toBig(3, 18),
                0,
            );

            console.log("Gas used normal (withdraw)", (await withdrawNormal.wait()).gasUsed.toString());
            console.log("Gas used redstone (withdraw)", (await withdrawRedstone.wait()).gasUsed.toString());
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
