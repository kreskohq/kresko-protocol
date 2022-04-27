import { FunctionFragment } from "@ethersproject/abi";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { fromBig, toBig } from "@utils";
import { Fixture } from "ethereum-waffle";
import { ABI, DeployOptions } from "hardhat-deploy/types";

import {
    FluxPriceFeed,
    ExampleFlashLiquidator,
    Kresko,
    MockWETH10,
    KrStaking,
    UniswapV2Pair,
    KrStakingUniHelper,
} from "types";
import { UniswapV2Factory, UniswapV2Router02 } from "./contracts";

declare module "mocha" {
    export interface Context {
        loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
        signers: {
            admin: SignerWithAddress;
            operator?: SignerWithAddress;
            userOne: SignerWithAddress;
            userTwo: SignerWithAddress;
            userThree?: SignerWithAddress;
            nonadmin?: SignerWithAddress;
            liquidator?: SignerWithAddress;
        };
        admin: string;
        userOne: string;
        UniFactory: UniswapV2Factory;
        UniRouter: UniswapV2Router02;
        lpPair: UniswapV2Pair;
        KrStaking: KrStaking;
        KrStakingUniHelper: KrStakingUniHelper;
        userTwo: string;
        treasury: string;
        pricefeed: FluxPriceFeed;
        TKN1: Token;
        TKN2: Token;
        USDC: Token;
        krTSLA: KreskoAsset;
        Kresko: Kresko;
        calculateAmountB: (
            amountA: BigNumber,
            tokenA: string,
            tokenB: string,
            pair: UniswapV2Pair,
        ) => Promise<BigNumber>;
        getMostProfitableLiquidation: (
            userAddress: string,
        ) => Promise<{ maxUSD: number; collateralAsset: string; krAsset: string }>;
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
        isProtocolSolvent: () => Promise<boolean>;
        FlashLiquidator: ExampleFlashLiquidator;
        WETH10: MockWETH10;
        WETH10OraclePrice: number;
        WETH10Oracle: FluxPriceFeed;
    }
}
export {};

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        deploy: <T extends Contract>(name: string, options?: DeployOptions) => Promise<DeployResultWithSignatures<T>>;
        getSignatures: (abi: ABI) => string[];
        utils: typeof import("ethers/lib/utils");
        bytesCall: <T>(func: FunctionFragment, params: T) => string;
        fromBig: typeof fromBig;
        toBig: typeof toBig;
        kresko: Kresko;
        krAssets: {
            [name: string]: KreskoAsset;
        };
        uniPairs: {
            [name: string]: UniswapV2Pair;
        };
        priceFeeds: {
            [description: string]: FluxPriceFeed;
        };
        priceAggregators: {
            [description: string]: FluxPriceAggregator;
        };
        priceFeedsRegistry: FeedsRegistry;
        constructors: {
            [contractName in SupportedContracts]: (overrides?: Partial<SupportedConstructors>) => SupportedConstructors;
        };
    }
}

export {};
