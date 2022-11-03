import { RAY } from "@kreskolabs/lib/dist/numbers/wadray";
import { BigNumber } from "ethers";
export const ONE_YEAR = "31536000";

export const getBlockTimestamp = async () => {
    const block = await hre.ethers.provider.getBlockNumber();
    const data = await hre.ethers.provider.getBlock(block);
    return BigNumber.from(data.timestamp);
};

export const calcIndexAdjustedAmount = async (amount: BigNumber, asset: KrAsset) => {
    return amount.rayMul(await hre.Diamond.getDebtIndexForAsset(asset.address));
};

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
export const calcCompoundedInterest = (
    rate: BigNumber,
    currentTimestamp: BigNumber,
    lastUpdateTimestamp: BigNumber,
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
