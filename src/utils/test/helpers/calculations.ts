import { RAY, oneRay } from "@kreskolabs/lib";
import { BigNumber } from "ethers";
export const ONE_YEAR = 60 * 60 * 24 * 365;

export const getBlockTimestamp = async () => {
    const block = await hre.ethers.provider.getBlockNumber();
    const data = await hre.ethers.provider.getBlock(block);
    return BigNumber.from(data.timestamp);
};

export const oraclePriceToWad = async (price: Promise<BigNumber>): Promise<BigNumber> =>
    (await price).mul(10 ** (18 - (await hre.Diamond.getExtOracleDecimals())));

export const fromScaledAmount = async (amount: BigNumber, asset: TestAsset) => {
    return amount;
};

export const toScaledAmount = async (amount: BigNumber, asset: TestKrAsset, prevDebtIndex?: BigNumber) => {
    return amount;
};
