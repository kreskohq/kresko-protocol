import { defaultRedstoneDataPoints } from "@deploy-config/shared";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { Kresko } from "types/typechain";

export const wrapKresko = (contract: Kresko, signer?: any) =>
    WrapperBuilder.wrap(signer ? contract.connect(signer) : contract).usingSimpleNumericMock({
        mockSignersCount: 1,
        timestampMilliseconds: Date.now(),
        dataPoints: defaultRedstoneDataPoints,
    }) as Kresko;

type DataPoints = {
    dataFeedId: string;
    value: number;
}[];
export const wrapPrices = (contract: Kresko, prices: DataPoints, signer?: any) =>
    WrapperBuilder.wrap(signer ? contract.connect(signer) : contract).usingSimpleNumericMock({
        mockSignersCount: 1,
        timestampMilliseconds: Date.now(),
        dataPoints: prices,
    }) as Kresko;
