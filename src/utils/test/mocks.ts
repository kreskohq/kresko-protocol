import { anchorTokenPrefix } from "@deploy-config/shared";
import { toBig, toFixedPoint } from "@kreskolabs/lib/dist/numbers";
import { HALF_PERCENTAGE, PERCENTAGE_FACTOR, oneRay, HALF_RAY } from "@kreskolabs/lib/dist/numbers/wadray";

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
    amount: string | number | BigNumber;
};

export type TestKreskoAssetArgs = {
    name: string;
    symbol?: string;
    anchorSymbol?: string;
    price: number;
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

export const defaultSupplyLimit = 10000;
export const defaultCloseFee = 0.02; // 2%
export const defaultOpenFee = 0; // 0%

export const defaultKrAssetArgs = {
    name: "KreskoAsset",
    symbol: "KreskoAsset",
    anchorTokenPrefix: anchorTokenPrefix + "KreskoAsset",
    price: defaultOraclePrice,
    factor: 1,
    supplyLimit: defaultSupplyLimit,
    closeFee: defaultCloseFee,
    openFee: defaultOpenFee,
    stabilityRates: {
        debtRateBase: oneRay.div(10000).mul(25),
        reserveFactor: PERCENTAGE_FACTOR, // 100%
        rateSlope1: oneRay.div(1000).mul(3),
        rateSlope2: oneRay.div(1000).mul(30),
        optimalPriceRate: oneRay, // price parity = 1 ray
        excessPriceRateDelta: oneRay.div(1000).mul(25), // 2% delta
    },
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
