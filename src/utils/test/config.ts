import { toFixedPoint } from "@utils/fixed-point";
import { toBig } from "@utils/numbers";

export const defaultOraclePrice = 10;
export const defaultOracleDecimals = 8;

export const defaultDecimals = 18;

export const defaultDepositAmount = toBig(10, defaultDecimals);
export const defaultMintAmount = toBig(100, defaultDecimals);

export const defaultSupplyLimit = 1000;

export const defaultKrAssetArgs = {
    name: "KreskoAsset",
    price: defaultOraclePrice,
    factor: 1.1,
    supplyLimit: defaultSupplyLimit,
};

export const defaultCollateralArgs = {
    name: "Collateral",
    price: defaultOraclePrice,
    factor: 0.9,
    decimals: defaultDecimals,
};

export const getNewMinterParams = (feeRecipient: string) => ({
    burnFee: toFixedPoint(0.02),
    liquidationIncentiveMultiplier: toFixedPoint(1.05),
    minimumCollateralizationRatio: toFixedPoint(1.4),
    minimumDebtValue: toFixedPoint(20),
    liquidationThreshold: toFixedPoint(1.3),
    feeRecipient: feeRecipient,
});

export default {
    supplyLimit: defaultSupplyLimit,
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
