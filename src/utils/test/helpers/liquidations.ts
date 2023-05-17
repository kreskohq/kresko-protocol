import { fromBig, toBig } from "@kreskolabs/lib";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { addMockCollateralAsset, depositCollateral, depositMockCollateral } from "./collaterals";
import { mintKrAsset } from "./krassets";

export const getLiqAmount = async (user: SignerWithAddress, krAsset: any, collateral: any, log = false) => {
    const accountMinimumCollateralValue = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
        user.address,
        await hre.Diamond.liquidationThreshold(),
    );

    const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(user.address);

    const ratio = await hre.Diamond.getAccountCollateralRatio(user.address);

    const kreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address);

    const maxLiquidatableValue = await hre.Diamond.getMaxLiquidation(user.address, krAsset.address, collateral.address);

    const krAssetPrice = await krAsset.getPrice();
    const collateralPrice = await collateral.getPrice();
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
    const collateralValue = await hre.Diamond.getAccountCollateralValue(user.address);
    const minCollateralValue = await hre.Diamond.getAccountMinimumCollateralValueAtRatio(
        user.address,
        await hre.Diamond.liquidationThreshold(),
    );

    const liquidationThreshold = await hre.Diamond.liquidationThreshold();

    const valueUnder = minCollateralValue.sub(collateralValue);
    const kreskoAsset = await hre.Diamond.kreskoAsset(krAsset.address);
    const collateralAsset = await hre.Diamond.collateralAsset(collateral.address);
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

    const collateralDepositValue = await hre.Diamond.getCollateralValueAndOraclePrice(
        collateral.address,
        await hre.Diamond.collateralDeposits(user.address, collateral.address),
        false,
    );

    const minDebt = await hre.Diamond.minimumDebtValue();
    if (collateralDepositValue.value.lt(maxLiquidatableUSD)) {
        return collateralDepositValue.value;
    } else if (maxLiquidatableUSD.lt(minDebt)) {
        return minDebt;
    }

    return maxLiquidatableUSD;
};
export const liquidate = async (user: SignerWithAddress, krAsset: any, collateral: any) => {
    const depositsBefore = await hre.Diamond.collateralDeposits(user.address, collateral.address);
    const debtBefore = await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address);
    const liqAmount = await getLiqAmount(user, krAsset, collateral);

    if (liqAmount.eq(0)) {
        return {
            collateralSeized: 0,
            debtRepaid: 0,
            tx: new Error("Not liquidatable"),
        };
    }
    if (krAsset.address === collateral.address) {
        const mockAsset = await addMockCollateralAsset({
            name: "quick",
            decimals: 18,
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

    const minDebt = await hre.Diamond.minimumDebtValue();
    const krAssetprice = await krAsset.getPrice();
    const liquidationAmount = liqAmount.lt(minDebt.wadDiv(krAssetprice)) ? minDebt.wadDiv(krAssetprice) : liqAmount;
    await mintKrAsset({
        user: hre.users.liquidator,
        asset: krAsset,
        amount: liquidationAmount,
    });

    const tx = await hre.Diamond.connect(hre.users.liquidator).liquidate(
        user.address,
        krAsset.address,
        liquidationAmount,
        collateral.address,
        await hre.Diamond.getMintedKreskoAssetsIndex(user.address, krAsset.address),
        await hre.Diamond.getDepositedCollateralAssetIndex(user.address, collateral.address),
    );
    const depositsAfter = await hre.Diamond.collateralDeposits(user.address, collateral.address);
    const debtAfter = await hre.Diamond.kreskoAssetDebt(user.address, krAsset.address);
    return {
        collateralSeized: fromBig(depositsBefore.sub(depositsAfter), await collateral.contract.decimals()),
        debtRepaid: fromBig(debtBefore.sub(debtAfter), 18),
        // tx,
    };
};
export const getCR = async (address: string, big = false) => {
    const accountCollateralValue = await hre.Diamond.getAccountCollateralValue(address);
    const debtValue = await hre.Diamond.getAccountKrAssetValue(address);
    const result = accountCollateralValue.wadDiv(debtValue);
    if (big) {
        return result;
    }
    return fromBig(accountCollateralValue.wadDiv(debtValue));
};
