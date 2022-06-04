import { FunctionFragment } from "@ethersproject/abi";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { fromBig, toBig } from "@utils";
import { Fixture } from "ethereum-waffle";
import { ABI, Deployment, DeployOptions, Facet, FacetCut } from "@kreskolabs/hardhat-deploy/dist/types";

import { FluxPriceFeed, UniswapV2Pair, UniswapV2Factory, UniswapV2Router02, Kresko } from "types/typechain";
import { BytesLike } from "ethers";

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
        users: {
            deployer: SignerWithAddress;
            owner: SignerWithAddress;
            operator: SignerWithAddress;
            userOne: SignerWithAddress;
            userTwo: SignerWithAddress;
            userThree: SignerWithAddress;
            nonadmin?: SignerWithAddress;
            liquidator?: SignerWithAddress;
        };
        // Diamond additions
        facets: Facet[];
        Diamond: Kresko;
        DiamondDeployment: Deployment;
        admin: string;
        userOne: string;
        UniFactory: UniswapV2Factory;
        UniRouter: UniswapV2Router02;
        lpPair: UniswapV2Pair;
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
        WETH10OraclePrice: number;
        WETH10Oracle: FluxPriceFeed;
    }
}
export {};

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        deploy: <T extends Contract>(name: string, options?: DeployOptions) => Promise<DeployResultWithSignatures<T>>;
        Diamond: Kresko;
        DiamondDeployment: Deployment;
        getAddFacetArgs: <T extends Contract>(
            facet: T,
            signatures?: string[],
            initializer?: {
                contract: Contract;
                functionName?: string;
                args?: any[];
            },
        ) => {
            facetCut: FacetCut;
            initialization: {
                _init: string;
                _calldata: BytesLike;
            };
        };
        getSignatures: (abi: ABI) => string[];
        getSignaturesWithNames: (abi: ABI) => { name: string; sig: string }[];
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
