import { anchorTokenPrefix } from "@deploy-config/shared";
import { toBig, oneRay } from "@kreskolabs/lib";

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
    asset: TestAsset | { address: string; contract: any; mocks: any };
    amount: string | number | BigNumber;
};

export type InputArgsSimple = Omit<InputArgs, "asset"> & {
    asset: { address: string };
};

export type TestKreskoAssetArgs = {
    name: string;
    symbol?: string;
    anchorSymbol?: string;
    price: number;
    marketOpen: boolean;
    oracle?: string;
    factor: number;
    supplyLimit: number;
    closeFee: number;
    openFee: number;
};
export type TestKreskoAssetUpdate = {
    name: string;
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

export const defaultSupplyLimit = 100000;
export const defaultCloseFee = 0.02; // 2%
export const defaultOpenFee = 0; // 0%
export const BASIS_POINT = oneRay.div(10000);
export const ONE_PERCENT = oneRay.div(100);
export const defaultKrAssetArgs = {
    name: "KreskoAsset",
    symbol: "KreskoAsset",
    anchorTokenPrefix: anchorTokenPrefix + "KreskoAsset",
    price: defaultOraclePrice,
    marketOpen: true,
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
    minCollateralRatio: toBig(1.4),
    minDebtValue: toBig(20, 8),
    liquidationThreshold: toBig(1.3),
    feeRecipient: feeRecipient,
    MLM: toBig(1.0002),
    oracleDeviationPct: toBig(0.2),
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
