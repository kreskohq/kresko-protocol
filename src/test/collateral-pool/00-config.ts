import { RAY, toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import { addMockCollateralAsset } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset } from "@utils/test/helpers/krassets";
import { getCR } from "@utils/test/helpers/liquidations";
import hre from "hardhat";
import {
    PoolCollateralStruct,
    PoolKrAssetStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

describe.only("Collateral Pool", function () {
    describe("#Configuration", async () => {
        it("should be able to add whitelisted collateral", async () => {
            const configuration: PoolCollateralStruct = {
                decimals: 18,
                liquidationIncentive: toBig(1.1),
                liquidityIndex: RAY,
            };
            await hre.Diamond.enablePoolCollaterals([CollateralAsset.address], [configuration]);
            const collateral = await hre.Diamond.getPoolCollateral(CollateralAsset.address);
            expect(collateral.decimals).to.equal(configuration.decimals);
            expect(collateral.liquidationIncentive).to.equal(configuration.liquidationIncentive);
            expect(collateral.liquidityIndex).to.equal(RAY);

            const collaterals = await hre.Diamond.getPoolCollateralAssets();
            expect(collaterals).to.deep.equal([CollateralAsset.address]);
        });
        it("should be able to add whitelisted kresko asset", async () => {
            const configuration: PoolKrAssetStruct = {
                openFee: toBig(0.01),
                closeFee: toBig(0.01),
                protocolFee: toBig(0.25),
                supplyLimit: toBig(1000000),
            };
            await hre.Diamond.enablePoolKrAssets([KreskoAsset.address], [configuration]);
            const kreskoAsset = await hre.Diamond.getPoolKrAsset(KreskoAsset.address);
            expect(kreskoAsset.openFee).to.equal(configuration.openFee);
            expect(kreskoAsset.closeFee).to.equal(configuration.closeFee);
            expect(kreskoAsset.protocolFee).to.equal(configuration.protocolFee);
            expect(kreskoAsset.supplyLimit).to.equal(configuration.supplyLimit);

            const krAssets = await hre.Diamond.getPoolKrAssets();
            expect(krAssets).to.deep.equal([KreskoAsset.address]);
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
