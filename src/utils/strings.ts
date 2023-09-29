import type { AllTokenSymbols } from "@deploy-config/shared";

export const getAnchorNameAndSymbol = (symbol: AllTokenSymbols, name?: string) => {
    return {
        anchorName: `Kresko Asset Anchor: ${name || symbol}`,
        anchorSymbol: `a${symbol}`,
    } as const;
};
