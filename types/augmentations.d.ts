// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { HardhatRuntimeEnvironment } from "hardhat/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Context } from "mocha";
import { FunctionFragment } from "@ethersproject/abi";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { fromBig, toBig } from "@utils/numbers";
import type { Fixture } from "ethereum-waffle";
import type { ABI, Deployment, DeployOptions, Facet, FacetCut } from "@kreskolabs/hardhat-deploy/dist/types";

import type {
    FluxPriceFeed,
    UniswapV2Pair,
    UniswapV2Factory,
    UniswapV2Router02,
    Kresko,
    IERC20MetadataUpgradeable,
    ERC20Upgradeable,
} from "types/typechain";
import type { BytesLike } from "ethers";
import type { GnosisSafeL2 } from "./typechain/GnosisSafeL2";
import type { FakeContract, MockContract } from "@defi-wonderland/smock";

declare module "mocha" {
    export interface Context {
        loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
        addCollateralAsset: (marketPrice: number, factor?: number) => Promise<MockContract<ERC20Upgradeable>>;
        addKrAsset: (marketPrice: number) => Promise<MockContract<KreskoAsset>>;
        signers: {
            admin: SignerWithAddress;
            operator?: SignerWithAddress;
            userOne: SignerWithAddress;
            userTwo: SignerWithAddress;
            userThree?: SignerWithAddress;
            nonadmin?: SignerWithAddress;
            liquidator?: SignerWithAddress;
            treasury?: SignerWithAddress;
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
            treasury?: SignerWithAddress;
        };
        // Diamond additions
        facets: Facet[];
        Multisig: GnosisSafeL2;
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

        Oracles: FakeContract<FluxPriceFeed>[];
        TKN1: IERC20MetadataUpgradeable;
        TKN2: IERC20MetadataUpgradeable;
        USDC: IERC20MetadataUpgradeable;
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
        Multisig: GnosisSafeL2;
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
