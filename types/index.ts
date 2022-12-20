import { Address } from "@kreskolabs/hardhat-deploy/types";

export * from "./typechain";
export { Kresko } from "./Kresko";
export type Fixtures = "diamond";

export type Asset = {
    name: string;
    symbol: string;
    price?: () => Promise<BigNumber>;
    marketOpen?: () => Promise<boolean>;
    oracle?: {
        name: string;
        description: string;
        chainlink?: string
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
        pools: [Asset, Asset, number][];
        rewardTokens: Asset[];
        rewardTokenAmounts: number[];
        rewardsPerBlock: number[];
        stakingPools: StakingPoolConfig[];
        gnosisSafeDeployments?: GnosisSafeDeployment[];
    };
};

export type MinterInitializer<A> = {
    name: string;
    args: A;
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
}

export type InterestRateConfig = {
    debtRateBase: BigNumber,
    reserveFactor: BigNumber,
    rateSlope1: BigNumber,
    rateSlope2: BigNumber,
    optimalPriceRate: BigNumber,
    excessPriceRate: BigNumber,
}