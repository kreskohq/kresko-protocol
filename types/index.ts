import { GetContractTypes } from "@kreskolabs/configs";
import { Address } from "hardhat-deploy/types";
import type * as Contracts from "./typechain";
import {
    CommonInitArgsStruct,
    MinterInitArgsStruct,
    SCDPInitArgsStruct,
} from "./typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

export type Split<S extends string, D extends string> = string extends S
    ? string[]
    : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
    ? [T, ...Split<U, D>]
    : [S];
export type Split2<S extends string, D extends string> = string extends S
    ? string[]
    : S extends never
    ? []
    : S extends `${infer T}${D}${infer U}`
    ? [...Split<U, D>]
    : [S];

export type ExcludeType<T, E> = {
    [K in keyof T]: T[K] extends E ? K : never;
}[keyof T];

export type Excludes =
    | "AccessControlEnumerableUpgradeable"
    | "AccessControlUpgradeable"
    | "FallbackManager"
    | "BaseGuard"
    | "Guard"
    | "GuardManager"
    | "ModuleManager"
    | "OwnerManager"
    | "EtherPaymentFallback"
    | "StorageAccessible";

export type ContractTypes = GetContractTypes<typeof Contracts>;
export type ContractNames = keyof ContractTypes;

export type ContractExports =
    | Contracts.Diamond
    | Contracts.WETH9
    | Contracts.KreskoAsset
    | Contracts.KreskoAssetAnchor
    | Contracts.AggregatorV3Interface
    | Contracts.ERC20;

// type x = ContractTypes["IKresko"];
export type Fixtures = "diamond";

export type Asset = {
    name: string;
    symbol: string;
    price?: () => Promise<BigNumber>;
    marketOpen?: () => Promise<boolean>;
    oracle?: {
        name: string;
        description: string;
        chainlink?: string;
    };
    cFactor?: number;
    kFactor?: number;
    decimals: number;
    mintAmount?: number;
    testAsset?: boolean;
};

export type StakingPoolConfig = {
    lpToken: [Asset, Asset];
    allocPoint: number;
    startBlock: number;
};

export type NetworkConfig = {
    [network: string]: {
        protocolParams: Omit<KreskoConstructor, "feeRecipient">;
        collaterals: Asset[];
        krAssets: Asset[];
        gnosisSafeDeployments?: GnosisSafeDeployment[];
    };
};

export type MinterInitializer = {
    name: "ConfigurationFacet";
    args: MinterInitArgsStruct;
};
export type SCDPInitializer = {
    name: "SCDPConfigFacet";
    args: SCDPInitArgsStruct;
};
export type CommonInitializer = {
    name: "CommonConfigurationFacet";
    args: CommonInitArgsStruct;
};

export type GnosisSafeDeployment = {
    defaultAddress: Address;
    released: boolean;
    contractName: string;
    version: string;
    networkAddresses: {
        opgoerli: string;
    };
    abi: any;
};

export type InterestRateConfig = {
    debtRateBase: BigNumber;
    reserveFactor: BigNumber;
    rateSlope1: BigNumber;
    rateSlope2: BigNumber;
    optimalPriceRate: BigNumber;
    excessPriceRate: BigNumber;
};
