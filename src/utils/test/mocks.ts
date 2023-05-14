import { anchorTokenPrefix } from "@deploy-config/shared";
import { toBig, toFixedPoint, oneRay } from "@kreskolabs/lib";

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
    stabilityRateBase?: BigNumber;
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
    stabilityRates: {
        stabilityRateBase: BASIS_POINT.mul(150), // 1.5%
        rateSlope1: BASIS_POINT.mul(200), // 2.0
        rateSlope2: BASIS_POINT.mul(600), // 5.0
        optimalPriceRate: oneRay, // price parity = 1 ray
        priceRateDelta: BASIS_POINT.mul(300), // 3.0% delta
    },
};

export const defaultCollateralArgs = {
    name: "Collateral",
    price: defaultOraclePrice,
    factor: 1,
    decimals: defaultDecimals,
};

export const getNewMinterParams = (feeRecipient: string) => ({
    minimumCollateralizationRatio: toFixedPoint(1.4),
    minimumDebtValue: toBig(20, 8),
    liquidationThreshold: toFixedPoint(1.3),
    feeRecipient: feeRecipient,
    MLM: toBig(1.0002),
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
