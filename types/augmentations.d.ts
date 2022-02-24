// eslint-disable @typescript-eslint/no-explicit-any
import { Fixture } from "ethereum-waffle";

import { Signers } from "./";
import { BasicOracle, ExampleFlashLiquidator, Kresko, MockWETH10 } from "../typechain";

declare module "mocha" {
    export interface Context {
        loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
        signers: Signers;
        Kresko: Kresko;
        getUserValues: () => Promise<
            {
                actualCollateralUSD: number;
                actualDebtUSD: number;
                isUserSolvent: boolean;
                collateralAmountVolative: number;
                collateralAmountStable: number;
                krAssetAmountVolative: number;
                krAssetAmountStable: number;
                debtUSDProtocol: number;
                collateralUSDProtocol: number;
                minCollateralUSD: number;
                isLiquidatable: boolean;
                userAddress: string;
            }[]
        >;
        isProtocolSolvent: () => Promise<Boolean>;
        FlashLiquidator: ExampleFlashLiquidator;
        WETH10: MockWETH10;
        WETH10OraclePrice: number;
        WETH10Oracle: BasicOracle;
    }
}
