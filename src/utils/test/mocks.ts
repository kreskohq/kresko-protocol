import { anchorTokenPrefix } from "@deploy-config/shared";
import { toBig, oneRay } from "@kreskolabs/lib";
import { OracleType } from "./oracles";

export type TestCollateralAssetArgs = {
    name: string;
    symbol: string;
    redstoneId: string;
    price: number;
    factor: number;
    decimals: number;
    pushOracle?: string;
    oracleIds?: [OracleType, OracleType];
};

export type TestCollateralAssetUpdate = {
    name: string;
    factor: number;
    pushOracle?: string;
    oracleIds?: [OracleType, OracleType];
    redstoneId: string;
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
    oracleIds?: [OracleType, OracleType];
    factor: number;
    supplyLimit: number;
    closeFee: number;
    openFee: number;
    redstoneId: string;
};
export type TestKreskoAssetUpdate = {
    name: string;
    oracle?: string;
    oracleIds?: [OracleType, OracleType];
    factor: number;
    supplyLimit: number;
    closeFee: number;
    openFee: number;
    redstoneId: string;
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
    name: "MockKreskoAsset",
    symbol: "MockKreskoAsset",
    redstoneId: "MockKreskoAsset",
    anchorTokenPrefix: anchorTokenPrefix + "MockKreskoAsset",
    price: defaultOraclePrice,
    oracleIds: [OracleType.Redstone, OracleType.Chainlink] as [OracleType, OracleType],
    marketOpen: true,
    factor: 1,
    supplyLimit: defaultSupplyLimit,
    closeFee: defaultCloseFee,
    openFee: defaultOpenFee,
};

export const defaultCollateralArgs: TestCollateralAssetArgs = {
    name: "MockCollateral",
    symbol: "MockCollateral",
    redstoneId: "MockCollateral",
    price: defaultOraclePrice,
    factor: 1,
    decimals: defaultDecimals,
    oracleIds: [OracleType.Redstone, OracleType.Chainlink] as [OracleType, OracleType],
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
