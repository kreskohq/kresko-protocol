import { RAY } from "@kreskolabs/lib/dist/numbers/wadray";
import { BigNumber } from "ethers";
import { FixedPoint } from "types/Kresko";
export const ONE_YEAR = 60 * 60 * 24 * 365;

export const getBlockTimestamp = async () => {
    const block = await hre.ethers.provider.getBlockNumber();
    const data = await hre.ethers.provider.getBlock(block);
    return BigNumber.from(data.timestamp);
};

export const oraclePriceToWad = async (price: Promise<FixedPoint.UnsignedStruct>): Promise<BigNumber> =>
    (await price).rawValue.mul(10 ** (18 - (await hre.Diamond.extOracleDecimals())));

export const calcExpectedStabilityRateNoPremium = (priceRate: BigNumber, krAssetArgs: any) => {
    return krAssetArgs.stabilityRates.stabilityRateBase.add(priceRate.rayMul(krAssetArgs.stabilityRates.rateSlope1));
};
export const calcExpectedStabilityRateLowPremium = (priceRate: BigNumber, krAssetArgs: any) => {
    const multiplier = krAssetArgs.stabilityRates.optimalPriceRate
        .sub(priceRate)
        .rayDiv(krAssetArgs.stabilityRates.priceRateDelta);

    return krAssetArgs.stabilityRates.stabilityRateBase
        .add(krAssetArgs.stabilityRates.rateSlope1)
        .add(
            krAssetArgs.stabilityRates.optimalPriceRate
                .rayMul(multiplier)
                .rayMul(krAssetArgs.stabilityRates.rateSlope2),
        );
};
export const calcExpectedStabilityRateHighPremium = (priceRate: BigNumber, krAssetArgs: any) => {
    const excessRate = priceRate.sub(krAssetArgs.stabilityRates.optimalPriceRate);
    return krAssetArgs.stabilityRates.stabilityRateBase
        .rayDiv(priceRate.percentMul(125e2))
        .add(krAssetArgs.stabilityRates.optimalPriceRate.sub(excessRate).rayMul(krAssetArgs.stabilityRates.rateSlope1));
};

export const calcDebtIndex = async (asset: Asset, prevDebtIndex: BigNumber, lastUpdate: BigNumber | number) => {
    const rate = await hre.Diamond.getStabilityRateForAsset(asset.address);
    const cumulatedRate = calcCompoundedInterest(rate, await getBlockTimestamp(), lastUpdate);
    return cumulatedRate.rayMul(prevDebtIndex);
};

export const fromScaledAmount = async (amount: BigNumber, asset: Asset) => {
    return amount.rayDiv(await hre.Diamond.getDebtIndexForAsset(asset.address));
};
export const toScaledAmount = async (amount: BigNumber, asset: KrAsset) => {
    return amount.rayMul(await hre.Diamond.getDebtIndexForAsset(asset.address));
};

export const toScaledAmountUser = async (user: SignerWithAddress, amount: BigNumber, asset: KrAsset) => {
    const [lastDebtIndex] = await hre.Diamond.getAccountStabilityRateData(user.address, asset.address);
    const debtIndex = await hre.Diamond.getDebtIndexForAsset(asset.address);
    return amount.wadToRay().rayDiv(lastDebtIndex).rayMul(debtIndex).rayToWad();
};
export const fromScaledAmountUser = async (user: SignerWithAddress, amount: BigNumber, asset: KrAsset) => {
    const [lastDebtIndex] = await hre.Diamond.getAccountStabilityRateData(user.address, asset.address);
    const debtIndex = await hre.Diamond.getDebtIndexForAsset(asset.address);
    return amount.rayMul(lastDebtIndex).rayDiv(debtIndex);
};

export const calcCompoundedInterest = (
    rate: BigNumber,
    currentTimestamp: BigNumber,
    lastUpdateTimestamp: BigNumber | number,
) => {
    const timeDifference = currentTimestamp.sub(lastUpdateTimestamp);
    const SECONDS_PER_YEAR = BigNumber.from(ONE_YEAR);

    if (timeDifference.eq(0)) {
        return BigNumber.from(RAY);
    }

    const expMinusOne = timeDifference.sub(1);
    const expMinusTwo = timeDifference.gt(2) ? timeDifference.sub(2) : 0;

    const basePowerTwo = rate.rayMul(rate).div(SECONDS_PER_YEAR.mul(SECONDS_PER_YEAR));
    const basePowerThree = basePowerTwo.rayMul(rate).div(SECONDS_PER_YEAR);

    const secondTerm = timeDifference.mul(expMinusOne).mul(basePowerTwo).div(2);
    const thirdTerm = timeDifference.mul(expMinusOne).mul(expMinusTwo).mul(basePowerThree).div(6);

    return BigNumber.from(RAY).add(rate.mul(timeDifference).div(SECONDS_PER_YEAR)).add(secondTerm).add(thirdTerm);
};
