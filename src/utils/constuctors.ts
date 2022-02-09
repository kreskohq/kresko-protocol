import { toFixedPoint } from "./fixed-point";
import { ethers } from "ethers";

export const constructors = {
    Kresko: (overrides?: Partial<KreskoConstructor>): KreskoConstructor => {
        const burnFee = toFixedPoint(overrides?.burnFee || process.env.BURN_FEE);
        const closeFactor = toFixedPoint(overrides?.closeFactor || process.env.CLOSE_FACTOR);
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

        return {
            burnFee,
            closeFactor,
            feeRecipient: feeRecipientAddress,
            liquidationIncentive,
            minimumCollateralizationRatio,
            minimumDebtValue,
        };
    },
};
