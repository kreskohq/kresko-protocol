import { toFixedPoint } from "./fixed-point";
import { ethers } from "ethers";

export const constructors = {
    Kresko: (overrides?: Partial<KreskoConstructor>): KreskoConstructor => {
        const burnFee = toFixedPoint(overrides?.burnFee || process.env.BURN_FEE);
        const liquidationIncentive = toFixedPoint(overrides?.liquidationIncentive || process.env.LIQUIDATION_INCENTIVE);
        const minimumCollateralizationRatio = toFixedPoint(
            overrides?.minimumCollateralizationRatio || process.env.MINIMUM_COLLATERALIZATION_RATIO,
        );
        const minimumDebtValue = toFixedPoint(overrides?.minimumDebtValue || process.env.MINIMUM_DEBT_VALUE);

        const feeRecipientAddressStr = overrides?.feeRecipient || process.env.FEE_RECIPIENT_ADDRESS;
        if (!feeRecipientAddressStr) {
            throw new Error("fee recipient address not set");
        }
        const feeRecipientAddress = ethers.utils.getAddress(feeRecipientAddressStr);
        const secondsUntilPriceStale = overrides?.secondsUntilPriceStale || process.env.SECONDS_UNTIL_PRICE_STALE;

        const liquidationThreshold = toFixedPoint(
            overrides?.liquidationThreshold || process.env.LIQUIDATION_THRESHOLD,
        );

        return {
            burnFee,
            feeRecipient: feeRecipientAddress,
            liquidationIncentive,
            minimumCollateralizationRatio,
            minimumDebtValue,
            secondsUntilPriceStale,
            liquidationThreshold,
        };
    },
};
