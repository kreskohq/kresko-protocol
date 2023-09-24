import { fromBig, toBig } from "@kreskolabs/lib";
import { wrapKresko } from "@utils/redstone";
import optimized from "@utils/test/helpers/optimizations";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { depositCollateral, depositMockCollateral } from "./collaterals";
import { mintKrAsset } from "./krassets";
export const getLiqAmount = async (user: SignerWithAddress, krAsset: any, collateral: any, log = false) => {
    const [maxLiquidatableValue, krAssetPrice] = await Promise.all([
        hre.Diamond.getMaxLiquidation(user.address, krAsset.address, collateral.address),
        krAsset.getPrice(),
    ]);

    if (log) {
        const [accountMinimumCollateralValue, accountCollateralValue, ratio, kreskoAssetDebt, collateralPrice] =
            await Promise.all([
                hre.Diamond.getAccountMinCollateralAtRatio(user.address, optimized.getLiquidationThreshold()),
                hre.Diamond.getAccountCollateralValue(user.address),
                hre.Diamond.getAccountCollateralRatio(user.address),
                hre.Diamond.getAccountDebtAmount(user.address, krAsset.address),
                collateral.getPrice(),
            ]);
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
    const liquidationThreshold = await optimized.getMaxLiquidationRatio();
    const [collateralValue, minCollateralValue, kreskoAsset, collateralAsset, collateralDepositValue, minDebt] =
        await Promise.all([
            hre.Diamond.getAccountCollateralValue(user.address),
            hre.Diamond.getAccountMinCollateralAtRatio(user.address, liquidationThreshold),
            hre.Diamond.getKreskoAsset(krAsset.address),
            hre.Diamond.getCollateralAsset(collateral.address),
            hre.Diamond.getCollateralAmountToValue(
                collateral.address,
                optimized.getAccountCollateralAmount(user.address, collateral.address),
                false,
            ),
            optimized.getMinDebtValue(),
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
    krAsset: TestKrAsset,
    collateral: any,
    allowSeizeUnderflow = false,
) => {
    const [depositsBefore, debtBefore, liqAmount] = await Promise.all([
        optimized.getAccountCollateralAmount(user.address, collateral),
        optimized.getAccountDebtAmount(user.address, krAsset),
        getLiqAmount(user, krAsset, collateral),
    ]);

    if (liqAmount.eq(0)) {
        return {
            collateralSeized: 0,
            debtRepaid: 0,
            tx: new Error("Not liquidatable"),
        };
    }
    const [minDebt, krAssetPrice] = await Promise.all([optimized.getMinDebtValue(), krAsset.getPrice()]);

    const minDebtAmount = minDebt.wadDiv(krAssetPrice);
    const liquidationAmount = liqAmount.lt(minDebtAmount) ? minDebtAmount : liqAmount;
    const liquidatorBal = await krAsset.balanceOf(hre.users.liquidator);
    if (liquidatorBal.lt(liquidationAmount)) {
        if (krAsset.address === collateral.address) {
            const mockCollateral2 = hre.collaterals.find(c => c.deployArgs.name === "MockCollateral2");
            await depositMockCollateral({
                user: hre.users.liquidator,
                asset: mockCollateral2!,
                amount: toBig(100_000),
            });
        } else {
            await collateral.contract.setVariable("_balances", {
                [hre.users.liquidator.address]: toBig(100_000),
            });
            await depositCollateral({
                user: hre.users.liquidator,
                asset: collateral,
                amount: toBig(100_000),
            });
        }
        await mintKrAsset({
            user: hre.users.liquidator,
            asset: krAsset,
            amount: liquidationAmount,
        });
    }

    const tx = await wrapKresko(hre.Diamond, hre.users.liquidator).liquidate(
        user.address,
        krAsset.address,
        liquidationAmount,
        collateral.address,
        optimized.getAccountMintIndex(user.address, krAsset.address),
        optimized.getAccountDepositIndex(user.address, collateral.address),
        allowSeizeUnderflow,
    );

    const [depositsAfter, debtAfter, decimals] = await Promise.all([
        optimized.getAccountCollateralAmount(user.address, collateral),
        optimized.getAccountDebtAmount(user.address, krAsset),
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
