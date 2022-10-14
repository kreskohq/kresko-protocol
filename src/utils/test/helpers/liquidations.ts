import hre from "hardhat";
import { fromBig } from "@kreskolabs/lib";
import { mintKrAsset } from "./krassets";

const getLiqAmount = async (user: SignerWithAddress, krAsset: any, collateral: any, log = false) => {
    const accountMinimumCollateralValue = fromBig(
        (
            await hre.Diamond.getAccountMinimumCollateralValueAtRatio(user.address, {
                rawValue: hre.toBig(1.4),
            })
        ).rawValue,
        8,
    );
    const accountCollateralValue = fromBig((await hre.Diamond.getAccountCollateralValue(user.address)).rawValue, 8);

    const kreskoAssetDebt = hre.fromBig(await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address));
    const maxLiquidatableValue = hre.fromBig(
        (await hre.Diamond.calculateMaxLiquidatableValueForAssets(user.address, krAsset.address, collateral.address))
            .rawValue,
        8,
    );
    const krAssetPrice = fromBig(await krAsset.getPrice(), 8);
    const collateralPrice = fromBig(await collateral.getPrice(), 8);
    if (log) {
        console.log("KrAsset Price:", krAssetPrice);
        console.log("Collateral Price:", collateralPrice);
        console.log("Value under: ", accountCollateralValue - accountMinimumCollateralValue);
        console.log("Kresko Asset Debt: ", kreskoAssetDebt);
        console.log("Max Liquidatable Value:", maxLiquidatableValue);
        console.log("Max Liquidatable KrAsset Amount:", maxLiquidatableValue / krAssetPrice);
    }
    return maxLiquidatableValue / krAssetPrice;
};

export const liquidate = async (user: SignerWithAddress, krAsset: any, collateral: any) => {
    const depositsBefore = hre.fromBig(await hre.Diamond.collateralDeposits(user.address, collateral.address));
    const debtBefore = hre.fromBig(await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address));

    const liqAmount = await getLiqAmount(user, krAsset, collateral);
    await mintKrAsset({
        user: hre.users.liquidator,
        asset: krAsset,
        amount: liqAmount,
    });

    const tx = await hre.Diamond.connect(hre.users.liquidator).liquidate(
        user.address,
        krAsset.address,
        hre.toBig(liqAmount),
        collateral.address,
        await hre.Diamond.getMintedKreskoAssetsIndex(user.address, krAsset.address),
        await hre.Diamond.getDepositedCollateralAssetIndex(user.address, collateral.address),
    );
    const depositsAfter = hre.fromBig(await hre.Diamond.collateralDeposits(user.address, collateral.address));
    const debtAfter = hre.fromBig(await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address));
    return {
        collateralSeized: depositsBefore - depositsAfter,
        debtRepaid: debtBefore - debtAfter,
        tx,
    };
};
