import { Fragment, FunctionFragment, JsonFragment } from "@ethersproject/abi";
import { fromBig, toBig } from "@kreskolabs/lib";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { Fixture } from "ethereum-waffle";
import type { ABI, DeployOptions, Deployment, Facet, FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";
import "hardhat/types/config";
import "mocha";

import type { FakeContract, MockContract } from "@defi-wonderland/smock";
import type { BytesLike, Contract, providers } from "ethers";
import { hardhatUsers } from "hardhat-configs/users";
import type {
    ERC20Upgradeable,
    UniswapV2Factory,
    UniswapV2Oracle,
    UniswapV2Pair,
    UniswapV2Router02,
} from "types/typechain";
import * as Contracts from "./typechain";
/* ========================================================================== */
/*                             TEST AUGMENTATIONS                             */
/* ========================================================================== */

declare module "mocha" {
    export interface Context {
        /* -------------------------------------------------------------------------- */
        /*                              Helper Functions                              */
        /* -------------------------------------------------------------------------- */
        loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
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
        addCollateralAsset: (marketPrice: number, factor?: number) => Promise<MockContract<ERC20Upgradeable>>;
        addKrAsset: (marketPrice: number) => Promise<MockContract<TC["KreskoAsset"]>>;

        /* -------------------------------------------------------------------------- */
        /*                               Users / Signers                              */
        /* -------------------------------------------------------------------------- */
        signers: {
            deployer: SignerWithAddress;
            owner: SignerWithAddress;
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
            admin: SignerWithAddress;
            operator: SignerWithAddress;
            userOne: SignerWithAddress;
            userTwo: SignerWithAddress;
            userThree: SignerWithAddress;
            nonadmin?: SignerWithAddress;
            liquidator?: SignerWithAddress;
            treasury?: SignerWithAddress;
        };
        /* -------------------------------------------------------------------------- */
        /*                                   Diamond                                  */
        /* -------------------------------------------------------------------------- */
        facets: Facet[];
        Multisig: GnosisSafeL2;
        Diamond: TC["Kresko"];
        DiamondDeployment: Deployment;
        collaterals: TestCollateral[];
        collateral: TestCollateral;
        krAsset: TestKrAsset;
        krAssets: TestKrAsset[];
        /* -------------------------------------------------------------------------- */
        /*                              Misc / Deprecated                             */
        /* -------------------------------------------------------------------------- */
        // @todo DEPRECATING
        UniV2Router: Contracts.UniswapV2Router02;
        UniV2Factory: Contracts.UniswapV2Factory;
        lpPair: Contracts.UniswapV2Pair;
        treasury: string;
        pricefeed: Contracts.FluxPriceFeed;
        // @todo DEPRECATING
        Oracles: FakeContract[];
        TKN1: Contracts.ERC20Upgradeable;
        TKN2: Contracts.ERC20Upgradeable;
        USDC: Contracts.ERC20Upgradeable;
        krTSLA: Contracts.KreskoAsset;
        Kresko: Contracts.Kresko;
        WETH10OraclePrice: number;
        WETH10Oracle: Contracts.FluxPriceFeed;
    }
}
export {};

/* ========================================================================== */
/*                         HARDHAT RUNTIME EXTENSIONS                         */
/* ========================================================================== */
declare module "hardhat/types/config" {
    // This is an example of an extension to one of the Hardhat config values.

    // We extend the UserConfig type, which represents the config as written
    // by the users. Things are normally optional here.
    export interface ProjectPathsUserConfig {
        exclude?: string[];
    }

    // We also extend the Config type, which represents the configuration
    // after it has been resolved. This is the type used during the execution
    // of tasks, tests and scripts.
    // Normally, you don't want things to be optional here. As you can apply
    // default values using the extendConfig function.
    export interface ProjectPathsConfig {
        exclude: string[];
    }
}

declare module "hardhat/types/runtime" {
    export type HardhatUsers<T> = {
        [key in keyof typeof hardhatUsers]: T;
    };

    interface HardhatRuntimeEnvironment {
        /* -------------------------------------------------------------------------- */
        /*                              Helper Functions                              */
        /* -------------------------------------------------------------------------- */

        fromBig: typeof fromBig;
        toBig: typeof toBig;
        admin: SignerWithAddress;
        getDeploymentOrNull: (deploymentName: string) => Promise<Deployment | null>;
        getContractOrFork: <T extends keyof TC>(type: T, deploymentName?: string) => Promise<TC[T]>;
        forking: {
            provider: providers.JsonRpcProvider;
            deploy: <T extends keyof TC>(
                type: T,
                options?: Partial<DeployOptions & { deploymentName?: string }>,
            ) => Promise<TC[T]>;
        };
        deploy<T extends keyof TC>(
            type: T,
            options?: Omit<DeployOptions, "from"> & { deploymentName?: string; from?: string },
        ): Promise<DeployResultWithSignatures<TC[T]>>;
        // deploy<C extends Contract>(id: string, options?: DeployOptions): Promise<DeployResultWithSignaturesUnknown<C>>;
        getSignature: (jsonItem: Fragment | JsonFragment | string) => string | false;
        getSignatures: (abi: ABI) => string[];
        getSignaturesWithNames: (abi: ABI) => { name: string; sig: string }[];
        bytesCall: <T>(func: FunctionFragment, params: T) => string;
        getFacetCut: <T extends keyof TC>(
            facet: T,
            action: number,
            signatures?: string[],
            initializer?: {
                contract: Contract;
                functionName?: string;
                args?: [string, BytesLike];
            },
        ) => Promise<{
            facetCut: FacetCut;
            initialization: {
                _init: string;
                _calldata: BytesLike;
            };
        }>;
        users: HardhatUsers<SignerWithAddress>;
        addr: HardhatUsers<string>;
        /* -------------------------------------------------------------------------- */
        /*                                   General                                  */
        /* -------------------------------------------------------------------------- */
        getUsers: () => Promise<HardhatUsers<SignerWithAddress>>;
        getAddresses: () => Promise<HardhatUsers<string>>;

        /* -------------------------------------------------------------------------- */
        /*                                 Deployment                                 */
        /* -------------------------------------------------------------------------- */

        DiamondDeployment: Deployment;
        Diamond: TC["Kresko"];
        Multisig: TC["GnosisSafeL2"];

        krAssets: TestKrAsset[];
        collateral: TestCollateral;
        krAsset: TestKrAsset;
        collaterals: TestCollateral[];
        allAssets: TestAsset[];
        facets: { name: string; address: string; functions: number }[];
        uniPairs: {
            [name: string]: UniswapV2Pair;
        };
        UniV2Oracle: UniswapV2Oracle;
        /* -------------------------------------------------------------------------- */
        /*                             Misc / Deprecating                             */
        /* -------------------------------------------------------------------------- */
        UniV2Factory: UniswapV2Factory;
        UniV2Router: UniswapV2Router02;
    }
}
