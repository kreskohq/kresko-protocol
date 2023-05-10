import hre from "hardhat";
import { fromBig, toBig } from "@kreskolabs/lib";
import { mintKrAsset } from "./krassets";
import { depositCollateral } from "./collaterals";
import { BigNumber } from "ethers";

export const getLiqAmount = async (user: SignerWithAddress, krAsset: any, collateral: any, log = false) => {
    const accountMinimumCollateralValue = fromBig(
        (
            await hre.Diamond.getAccountMinimumCollateralValueAtRatio(user.address, {
                rawValue: hre.toBig(1.4),
            })
        ).rawValue,
        8,
    );
    const accountCollateralValue = fromBig((await hre.Diamond.getAccountCollateralValue(user.address)).rawValue, 8);

    const ratio = fromBig((await hre.Diamond.getAccountCollateralRatio(user.address)).rawValue, 18);

    const kreskoAssetDebt = hre.fromBig(await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address));
    const maxLiquidatableValue = hre.fromBig(
        (await hre.Diamond.calculateMaxLiquidatableValueForAssets(user.address, krAsset.address, collateral.address))
            .rawValue,
        8,
    );
    const krAssetPrice = fromBig(await krAsset.getPrice(), 8);
    const collateralPrice = fromBig(await collateral.getPrice(), 8);
    if (log) {
        console.table({
            krAssetPrice,
            collateralPrice,
            accountCollateralValue,
            accountMinimumCollateralValue,
            ratio,
            valueUnder: accountMinimumCollateralValue - accountCollateralValue,
            kreskoAssetDebt,
            maxValue: maxLiquidatableValue,
            maxAmount: maxLiquidatableValue / krAssetPrice,
        });
    }
    return maxLiquidatableValue / krAssetPrice;
};
export const calcExpectedMaxLiquidatableValue = async (user: SignerWithAddress, krAsset: any, collateral: any) => {
    const collateralValue = (await hre.Diamond.getAccountCollateralValue(user.address)).rawValue;
    const minCollateralValue = (
        await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
            user.address,
            await hre.Diamond.liquidationThreshold(),
        )
    ).rawValue;

    const liquidationThreshold = (await hre.Diamond.liquidationThreshold()).rawValue;

    const valueUnder = minCollateralValue.sub(collateralValue);
    const kreskoAsset = await hre.Diamond.kreskoAsset(krAsset.address);
    const collateralAsset = await hre.Diamond.collateralAsset(collateral.address);
    const debtFactor = kreskoAsset.kFactor.rawValue
        .wadMul(liquidationThreshold)
        .wadDiv(collateralAsset.factor.rawValue);
    if (collateralValue.gte(minCollateralValue)) {
        const valueGainPerUSDRepaid = debtFactor
            .sub(collateralAsset.liquidationIncentive.rawValue)
            .sub(kreskoAsset.closeFee.rawValue)
            .wadDiv(debtFactor);
        return BigNumber.from(0);
    }
    // const valueGainPerUSDRepaid = debtFactor

    //     .sub(kreskoAsset.closeFee.rawValue)
    //     .wadDiv(debtFactor);

    // const maxLiquidatableUSD = valueUnder
    //     .wadDiv(debtFactor)
    //     .wadMul(collateralAsset.liquidationIncentive.rawValue.add(kreskoAsset.closeFee.rawValue))
    //     .wadMul(toBig(4.67));
    const maxLiquidatableUSD = valueUnder.wadDiv(toBig(1.1175));
    const collateralDepositValue = await hre.Diamond.getCollateralValueAndOraclePrice(
        collateral.address,
        await hre.Diamond.collateralDeposits(user.address, collateral.address),
        false,
    );

    const minDebt = (await hre.Diamond.minimumDebtValue()).rawValue;
    const maxtest = await hre.Diamond.calculateMaxLiquidatableValueForAssets(
        user.address,
        krAsset.address,
        collateral.address,
    );
    console.log("maxLiq", fromBig(maxLiquidatableUSD, 8));
    console.log("maxLiqOnchain", fromBig(maxtest.rawValue, 8));
    console.log("minC", fromBig(minCollateralValue, 8));
    console.log("caccval", fromBig(collateralValue, 8));
    console.log("cval", fromBig(collateralDepositValue.value.rawValue, 8));
    if (collateralDepositValue.value.rawValue.lt(maxLiquidatableUSD)) {
        return collateralDepositValue.value.rawValue;
    }
    // else if (maxLiquidatableUSD.lt(minDebt)) {
    //     return minDebt;
    // }
    return maxLiquidatableUSD;
};

export const liquidate = async (user: SignerWithAddress, krAsset: any, collateral: any) => {
    const depositsBefore = hre.fromBig(await hre.Diamond.collateralDeposits(user.address, collateral.address));
    const debtBefore = hre.fromBig(await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address));

    const liqAmount = await getLiqAmount(user, krAsset, collateral);
    if (liqAmount > 0) {
        await depositCollateral({
            user: hre.users.liquidator,
            asset: collateral,
            amount: toBig(100),
        });
        const mindebt = fromBig((await hre.Diamond.minimumDebtValue()).rawValue, 8);
        const krAssetprice = fromBig(await krAsset.getPrice(), 8);

        await mintKrAsset({
            user: hre.users.liquidator,
            asset: krAsset,
            amount: liqAmount < mindebt / krAssetprice ? mindebt / krAssetprice : liqAmount,
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
    } else {
        return {
            collateralSeized: 0,
            debtRepaid: 0,
            tx: new Error("Not liquidatable"),
        };
    }
};
export const getCR = async (address: string) => {
    const accountCollateralValue = fromBig((await hre.Diamond.getAccountCollateralValue(address)).rawValue, 8);
    const debtValue = fromBig((await hre.Diamond.getAccountKrAssetValue(address)).rawValue, 8);
    console.log("Account Collateral Value", accountCollateralValue);
    console.log("Account Debt Value", debtValue);
    console.log((await hre.Diamond.getAccountCollateralValue(address)).rawValue);
    console.log((await hre.Diamond.getAccountKrAssetValue(address)).rawValue);
    return accountCollateralValue / debtValue;
};
