import { BigNumber, utils } from "ethers";

const { formatUnits, parseUnits, parseEther, formatEther } = utils;

export const fromBig = (amount: BigNumberish | any, unitsOrDecimals: BigNumberish = 18) =>
    parseFloat(formatUnits(amount.toString(), unitsOrDecimals));
export const toBig = (amount: number | string, unitsOrDecimals: BigNumberish = 18) =>
    typeof amount === "string" ? parseUnits(amount, unitsOrDecimals) : parseUnits(amount.toString(), unitsOrDecimals);

export { parseEther, formatUnits, parseUnits, formatEther, BigNumber };
