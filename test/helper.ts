import { waffle, ethers } from "hardhat";
import { BigNumber } from "ethers";
import { MockToken, BasicOracle, RebasingToken } from "../typechain";
import { toFixedPoint } from "../utils/fixed-point";
import { parseUnits } from "ethers/lib/utils";

export const ADDRESS_ZERO = ethers.constants.AddressZero;
export const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
export const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
export const SYMBOL_ONE = "ONE";
export const SYMBOL_TWO = "TWO";
export const NAME_ONE = "One Kresko Asset";
export const NAME_TWO = "Two Kresko Asset";
export const BURN_FEE = toFixedPoint(0.01); // 1%
export const MINIMUM_COLLATERALIZATION_RATIO = toFixedPoint(1.5); // 150%
export const CLOSE_FACTOR = toFixedPoint(0.2); // 20%
export const LIQUIDATION_INCENTIVE = toFixedPoint(1.1); // 110% -> liquidators make 10% on liquidations
export const FEE_RECIPIENT_ADDRESS = "0x0000000000000000000000000000000000000FEE";

export const { parseEther, formatUnits } = ethers.utils;
export const fromBig = (amount: BigNumber, decimals = 18) => parseFloat(formatUnits(amount, decimals));
export const toBig = (amount: number | string, decimals = 18) => parseUnits(amount.toString(), decimals);
export const { deployContract } = waffle;

export const ONE = toFixedPoint(1);
export const ZERO_POINT_FIVE = toFixedPoint(0.5);

export interface CollateralAssetInfo {
    collateralAsset: MockToken;
    oracle: BasicOracle;
    factor: BigNumber;
    oraclePrice: BigNumber;
    decimals: number;
    fromDecimal: (decimalValue: any) => BigNumber;
    fromFixedPoint: (fixedPointValue: BigNumber) => BigNumber;
    rebasingToken: RebasingToken | undefined;
}
