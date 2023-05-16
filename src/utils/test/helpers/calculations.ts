import { RAY, oneRay } from "@kreskolabs/lib";
import { BigNumber } from "ethers";
export const ONE_YEAR = 60 * 60 * 24 * 365;

export const getBlockTimestamp = async () => {
    const block = await hre.ethers.provider.getBlockNumber();
    const data = await hre.ethers.provider.getBlock(block);
    return BigNumber.from(data.timestamp);
};
export function getExpectedStabilityRate(priceRate: BigNumber, krAssetArgs: any): BigNumber {
    const rateIsGTOptimal = priceRate.gt(krAssetArgs.optimalPriceRate);
    const rateDiff = rateIsGTOptimal
        ? priceRate.sub(krAssetArgs.optimalPriceRate)
        : krAssetArgs.optimalPriceRate.sub(priceRate);

    const rateDiffAdjusted = rateDiff.rayMul(
        krAssetArgs.rateSlope2.rayDiv(krAssetArgs.rateSlope1.add(krAssetArgs.priceRateDelta)),
    );

    if (!rateIsGTOptimal) {
        // Case: AMM price is lower than priceRate
        return krAssetArgs.stabilityRateBase.add(rateDiffAdjusted);
    } else {
        // Case: AMM price is higher than priceRate
        return krAssetArgs.stabilityRateBase.rayDiv(oneRay.add(rateDiffAdjusted));
    }
}
export const oraclePriceToWad = async (price: Promise<BigNumber>): Promise<BigNumber> =>
    (await price).mul(10 ** (18 - (await hre.Diamond.extOracleDecimals())));

export const calcDebtIndex = async (asset: TestAsset, prevDebtIndex: BigNumber, lastUpdate: BigNumber | number) => {
    const rate = await hre.Diamond.getStabilityRateForAsset(asset.address);
    const cumulatedRate = calcCompoundedInterest(rate, await getBlockTimestamp(), lastUpdate);
    return cumulatedRate.rayMul(prevDebtIndex);
};

export const fromScaledAmount = async (amount: BigNumber, asset: TestAsset) => {
    return amount
        .wadToRay()
        .rayDiv(await hre.Diamond.getDebtIndexForAsset(asset.address))
        .rayToWad();
};
export const toScaledAmount = async (amount: BigNumber, asset: TestKrAsset, prevDebtIndex?: BigNumber) => {
    const debtIndex = await hre.Diamond.getDebtIndexForAsset(asset.address);
    return prevDebtIndex
        ? amount.wadToRay().rayDiv(prevDebtIndex).rayMul(debtIndex).rayToWad()
        : amount.wadToRay().rayMul(debtIndex).rayToWad();
};

export const toScaledAmountUser = async (user: SignerWithAddress, amount: BigNumber, asset: TestKrAsset) => {
    const lastDebtIndex = await hre.Diamond.getLastDebtIndexForAccount(user.address, asset.address);
    const debtIndex = await hre.Diamond.getDebtIndexForAsset(asset.address);
    return amount.wadToRay().rayDiv(lastDebtIndex).rayMul(debtIndex).rayToWad();
};
export const fromScaledAmountUser = async (user: SignerWithAddress, amount: BigNumber, asset: TestKrAsset) => {
    const lastDebtIndex = await hre.Diamond.getLastDebtIndexForAccount(user.address, asset.address);
    const debtIndex = await hre.Diamond.getDebtIndexForAsset(asset.address);
    return amount.wadToRay().rayMul(lastDebtIndex).rayDiv(debtIndex).rayToWad();
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
