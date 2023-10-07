import type { AllTokenSymbols } from '@config/deploy';

export const getAnchorNameAndSymbol = (symbol: AllTokenSymbols, name?: string) => {
  return {
    anchorName: `Kresko Asset Anchor: ${name || symbol}`,
    anchorSymbol: `a${symbol}`,
  } as const;
};
