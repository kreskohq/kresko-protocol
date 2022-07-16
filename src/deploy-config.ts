import { toFixedPoint } from "@utils/fixed-point";

type Asset = {
    name: string;
    symbol: string;
    price: BigNumber;
    oracle: {
        name: string;
        description: string;
    };
    factor: number;
    decimals: number;
    mintAmount?: number;
};

type StakingPoolConfig = {
    lpToken: [Asset, Asset];
    allocPoint: number;
    startBlock: number;
};

type NetworkConfig = {
    [network: string]: {
        protocolParams: Omit<KreskoConstructor, "feeRecipient">;
        collaterals: Asset[];
        krAssets: Asset[];
        pools: [Asset, Asset, number][];
        rewardTokens: Asset[];
        rewardTokenAmounts: number[];
        rewardsPerBlock: number[];
        stakingPools: StakingPoolConfig[];
    };
};

export const assets: { [asset: string]: Asset } = {
    Aurora: {
        name: "Aurora",
        symbol: "AURORA",
        decimals: 18,
        price: toFixedPoint("1.45", 8),
        oracle: {
            name: "AURORAUSD",
            description: "AURORA/USD",
        },
        factor: 0.75,
        mintAmount: 10_000_000,
    },
    USDC: {
        name: "USDC",
        symbol: "USDC",
        decimals: 6,
        price: toFixedPoint("1", 8),
        oracle: {
            name: "USD",
            description: "/USD",
        },
        factor: 0.95,
        mintAmount: 100_000_000,
    },
    OP: {
        name: "OP",
        symbol: "OP",
        decimals: 18,
        price: toFixedPoint("0.52", 8),
        oracle: {
            name: "OPUSD",
            description: "OP/USD",
        },
        factor: 0.75,
        mintAmount: 10_000_000,
    },
    WETH: {
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        price: toFixedPoint("1318.24", 8),
        oracle: {
            name: "ETHUSD",
            description: "ETH/USD",
        },
        factor: 0.8,
        mintAmount: 10_000,
    },
    WNEAR: {
        name: "Wrapped Near",
        symbol: "WNEAR",
        decimals: 18,
        price: toFixedPoint("3.51", 8),
        oracle: {
            name: "NEARUSD",
            description: "NEAR/USD",
        },
        factor: 0.75,
        mintAmount: 10_000_000,
    },
    krTSLA: {
        name: "Tesla, Inc.",
        symbol: "krTSLA",
        decimals: 18,
        price: toFixedPoint("720.18", 8),
        oracle: {
            name: "TSLAUSD",
            description: "TSLA/USD",
        },
        factor: 1.25,
        mintAmount: 1000,
    },
    krQQQ: {
        name: "Invesco QQQ Trust",
        symbol: "krQQQ",
        decimals: 18,
        price: toFixedPoint("310.25", 8),
        oracle: {
            name: "QQQUSD",
            description: "QQQ/USD",
        },
        factor: 1.2,
        mintAmount: 2000,
    },
    krIAU: {
        name: "iShares Gold Trust",
        symbol: "krIAU",
        decimals: 18,
        price: toFixedPoint("31.20", 8),
        oracle: {
            name: "GOLDUSD",
            description: "GOLD/USD",
        },
        factor: 1.1,
        mintAmount: 20000,
    },
    krGME: {
        name: "GameStop Corp.",
        symbol: "krGME",
        decimals: 18,
        price: toFixedPoint("141.4", 8),
        oracle: {
            name: "GMEUSD",
            description: "GME/USD",
        },
        factor: 1.25,
        mintAmount: 4000,
    },
};

const defaultParams: Omit<KreskoConstructor, "feeRecipient"> = {
    burnFee: "0.015",
    liquidationIncentive: "1.1",
    minimumCollateralizationRatio: "1.5",
    minimumDebtValue: "10",
    secondsUntilPriceStale: "60",
};

const defaultPools: [Asset, Asset, number][] = [
    [assets.USDC, assets.krTSLA, assets.krTSLA.mintAmount],
    [assets.USDC, assets.krQQQ, assets.krQQQ.mintAmount],
    [assets.USDC, assets.krGME, assets.krGME.mintAmount],
    [assets.USDC, assets.krIAU, assets.krIAU.mintAmount],
    [assets.USDC, assets.WETH, 2500],
    [assets.USDC, assets.WNEAR, 150000],
];

const defaultStakingPools: StakingPoolConfig[] = [
    {
        lpToken: [assets.USDC, assets.krTSLA],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.USDC, assets.krGME],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.USDC, assets.krIAU],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.USDC, assets.krQQQ],
        allocPoint: 1000,
        startBlock: 0,
    },
];

export const testnetConfigs: NetworkConfig = {
    hardhat: {
        protocolParams: defaultParams,
        collaterals: [assets.USDC, assets.OP, assets.Aurora, assets.WETH, assets.WNEAR],
        krAssets: [assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.OP],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
    localhost: {
        protocolParams: defaultParams,
        collaterals: [assets.USDC, assets.OP, assets.Aurora, assets.WETH, assets.WNEAR],
        krAssets: [assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.OP],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
    opkovan: {
        protocolParams: defaultParams,
        collaterals: [assets.USDC, assets.OP, assets.WETH, assets.WNEAR],
        krAssets: [assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.OP],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
    opgoerli: {
        protocolParams: defaultParams,
        collaterals: [assets.USDC, assets.OP, assets.WETH, assets.WNEAR],
        krAssets: [assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.OP],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
    auroratest: {
        protocolParams: defaultParams,
        collaterals: [assets.USDC, assets.Aurora, assets.WETH, assets.WNEAR],
        krAssets: [assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.Aurora],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
};
