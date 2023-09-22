import { fromBig, toBig } from "@kreskolabs/lib";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { addMockCollateralAsset, depositCollateral, depositMockCollateral } from "./collaterals";
import { mintKrAsset } from "./krassets";
import { wrapContractWithSigner } from "./general";

export const getLiqAmount = async (user: SignerWithAddress, krAsset: any, collateral: any, log = false) => {
    const liqThreshold = await hre.Diamond.getLiquidationThreshold();
    const [
        accountMinimumCollateralValue,
        accountCollateralValue,
        ratio,
        kreskoAssetDebt,
        maxLiquidatableValue,
        krAssetPrice,
        collateralPrice,
    ] = await Promise.all([
        hre.Diamond.getAccountMinCollateralAtRatio(user.address, liqThreshold),
        hre.Diamond.getAccountCollateralValue(user.address),
        hre.Diamond.getAccountCollateralRatio(user.address),
        hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
        hre.Diamond.getMaxLiquidation(user.address, krAsset.address, collateral.address),
        krAsset.getPrice(),
        collateral.getPrice(),
    ]);

    if (log) {
        console.table({
            krAssetPrice,
            collateralPrice,
            accountCollateralValue,
            accountMinimumCollateralValue,
            ratio,
            valueUnder: fromBig(accountMinimumCollateralValue.sub(accountCollateralValue), 8),
            kreskoAssetDebt,
            maxValue: maxLiquidatableValue,
            maxAmount: maxLiquidatableValue.wadDiv(krAssetPrice),
        });
    }

    return maxLiquidatableValue.wadDiv(krAssetPrice);
};
export const getExpectedMaxLiq = async (user: SignerWithAddress, krAsset: any, collateral: any) => {
    const liquidationThreshold = await hre.Diamond.getLiquidationThreshold();
    const [collateralValue, minCollateralValue, kreskoAsset, collateralAsset, collateralDepositValue, minDebt] =
        await Promise.all([
            hre.Diamond.getAccountCollateralValue(user.address),
            hre.Diamond.getAccountMinCollateralAtRatio(user.address, liquidationThreshold),
            hre.Diamond.getKreskoAsset(krAsset.address),
            hre.Diamond.getCollateralAsset(collateral.address),
            hre.Diamond.getCollateralAmountToValue(
                collateral.address,
                hre.Diamond.getAccountCollateralAmount(user.address, collateral.address),
                false,
            ),
            hre.Diamond.getMinDebtValue(),
        ]);

    const valueUnder = minCollateralValue.sub(collateralValue);
    const debtFactor = kreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateralAsset.factor);
    if (collateralValue.gte(minCollateralValue)) {
        return BigNumber.from(0);
    }

    const valueGainPerUSDRepaid = debtFactor
        .sub(collateralAsset.liquidationIncentive)
        .sub(kreskoAsset.closeFee)
        .wadDiv(debtFactor);

    const maxLiquidatableUSD = valueUnder
        .wadDiv(valueGainPerUSDRepaid)
        .wadDiv(debtFactor)
        .wadDiv(collateralAsset.factor);

    if (collateralDepositValue.value.lt(maxLiquidatableUSD)) {
        return collateralDepositValue.value;
    } else if (maxLiquidatableUSD.lt(minDebt)) {
        return minDebt;
    }

    return maxLiquidatableUSD;
};
export const liquidate = async (
    user: SignerWithAddress,
    krAsset: any,
    collateral: any,
    allowSeizeUnderflow = false,
) => {
    const [depositsBefore, debtBefore, liqAmount] = await Promise.all([
        hre.Diamond.getAccountCollateralAmount(user.address, collateral.address),
        hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
        getLiqAmount(user, krAsset, collateral),
    ]);
    // const depositsBefore = await hre.Diamond.getAccountCollateralAmount(user.address, collateral.address);
    // const debtBefore = await hre.Diamond.getAccountDebtAmount(user.address, krAsset.address);
    // const liqAmount = await getLiqAmount(user, krAsset, collateral);

    if (liqAmount.eq(0)) {
        return {
            collateralSeized: 0,
            debtRepaid: 0,
            tx: new Error("Not liquidatable"),
        };
    }
    if (krAsset.address === collateral.address) {
        const mockAsset = await addMockCollateralAsset({
            name: "KreskoAssetLiquidate",
            symbol: "KreskoAssetLiquidate",
            decimals: 18,
            redstoneId: "KreskoAssetLiquidate",
            price: 1,
            factor: 1,
        });

        await mockAsset.mocks!.contract.setVariable("_balances", {
            [hre.users.liquidator.address]: toBig(100_000),
        });
        await depositMockCollateral({
            user: hre.users.liquidator,
            asset: mockAsset,
            amount: toBig(100_000),
        });
    } else {
        await collateral.mocks.contract.setVariable("_balances", {
            [hre.users.liquidator.address]: toBig(100),
        });
        await depositMockCollateral({
            user: hre.users.liquidator,
            asset: collateral,
            amount: toBig(100_000),
        });
    }

    // const minDebt = await hre.Diamond.getMinDebtValue();
    // const krAssetprice = await krAsset.getPrice();

    const [minDebt, krAssetPrice] = await Promise.all([hre.Diamond.getMinDebtValue(), krAsset.getPrice()]);
    const liquidationAmount = liqAmount.lt(minDebt.wadDiv(krAssetPrice)) ? minDebt.wadDiv(krAssetPrice) : liqAmount;

    const [, mintIndex, depositIndex] = await Promise.all([
        mintKrAsset({
            user: hre.users.liquidator,
            asset: krAsset,
            amount: liquidationAmount,
        }),
        hre.Diamond.getAccountMintIndex(user.address, krAsset.address),
        hre.Diamond.getAccountDepositIndex(user.address, collateral.address),
    ]);
    const tx = await wrapContractWithSigner(hre.Diamond, hre.users.liquidator).liquidate(
        user.address,
        krAsset.address,
        liquidationAmount,
        collateral.address,
        mintIndex,
        depositIndex,
        allowSeizeUnderflow,
    );

    const [depositsAfter, debtAfter, decimals] = await Promise.all([
        hre.Diamond.getAccountCollateralAmount(user.address, collateral.address),
        hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
        collateral.contract.decimals(),
    ]);
    return {
        collateralSeized: fromBig(depositsBefore.sub(depositsAfter), decimals),
        debtRepaid: fromBig(debtBefore.sub(debtAfter), 18),
        tx,
    };
};
export const getCR = async (address: string, big = false) => {
    const [accountCollateralValue, debtValue] = await Promise.all([
        hre.Diamond.getAccountCollateralValue(address),
        hre.Diamond.getAccountDebtValue(address),
    ]);
    const result = accountCollateralValue.wadDiv(debtValue);
    if (big) {
        return result;
    }
    return fromBig(accountCollateralValue.wadDiv(debtValue));
};
