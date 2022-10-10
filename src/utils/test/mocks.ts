import { toFixedPoint } from "@utils/fixed-point";
import { toBig } from "@utils/numbers";
import { wrapperPrefix } from "src/config/minter";
export type TestCollateralAssetArgs = {
    name: string;
    price: number;
    factor: number;
    decimals: number;
    oracle?: string;
};

export type TestCollateralAssetUpdate = {
    name: string;
    factor: number;
    oracle?: string;
};
export type InputArgs = {
    user: SignerWithAddress;
    asset: KrAsset | Collateral;
    amount: number | string;
};

export type TestKreskoAssetArgs = {
    name: string;
    symbol?: string
    wrapperSymbol?: string
    price: number;
    mintable?: boolean;
    oracle?: string;
    factor: number;
    supplyLimit: number;
    closeFee: number;
    openFee: number;
};
export type TestKreskoAssetUpdate = {
    name: string;
    mintable?: boolean;
    oracle?: string;
    factor: number;
    supplyLimit: number;
    closeFee: number;
    openFee: number;
};

export const defaultOraclePrice = 10;
export const defaultOracleDecimals = 8;

export const defaultDecimals = 18;

export const defaultDepositAmount = toBig(10, defaultDecimals);
export const defaultMintAmount = toBig(100, defaultDecimals);

export const defaultSupplyLimit = 10000;
export const defaultCloseFee = 0.01; // 1%
export const defaultOpenFee = 0.01; // 1%

export const defaultKrAssetArgs = {
    name: "KreskoAsset",
    symbol: "KreskoAsset",
    wrapperPrefix: wrapperPrefix + "KreskoAsset",
    price: defaultOraclePrice,
    factor: 1,
    supplyLimit: defaultSupplyLimit,
    closeFee: defaultCloseFee,
    openFee: defaultOpenFee,
};

export const defaultCollateralArgs = {
    name: "Collateral",
    price: defaultOraclePrice,
    factor: 1,
    decimals: defaultDecimals,
};

export const getNewMinterParams = (feeRecipient: string) => ({
    liquidationIncentiveMultiplier: toFixedPoint(1.05),
    minimumCollateralizationRatio: toFixedPoint(1.4),
    minimumDebtValue: toFixedPoint(20),
    liquidationThreshold: toFixedPoint(1.3),
    feeRecipient: feeRecipient,
});

export default {
    supplyLimit: defaultSupplyLimit,
    closeFee: defaultCloseFee,
    openFee: defaultOpenFee,
    mintAmount: defaultMintAmount,
    depositAmount: defaultDepositAmount,
    collateralArgs: defaultCollateralArgs,
    krAssetArgs: defaultKrAssetArgs,
    oracle: {
        price: defaultOraclePrice,
        decimals: defaultOracleDecimals,
    },
    getNewMinterParams,
};
