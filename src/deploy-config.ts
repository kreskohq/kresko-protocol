import { toFixedPoint } from "@utils/fixed-point";
import fetch from "node-fetch";

type Asset = {
    name: string;
    symbol: string;
    price: () => Promise<BigNumber>;
    oracle: {
        name: string;
        description: string;
    };
    cFactor?: number;
    kFactor?: number;
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

export const getPriceFromTwelveData = async (symbol: string) => {
    const result = await fetch(
        `https://api.twelvedata.com/price?symbol=${symbol}&prepost=true&apikey=${process.env.TWELVE_DATA_API_KEY}`,
    );
    const data = (await result.json()) as { price: string };
    return Number(data.price).toFixed(1);
};
export const getPriceFromCoinGecko = async (symbol: string) => {
    const result = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
    const data = (await result.json()) as { [key: string]: { usd: string } };
    return Number(data[symbol].usd).toFixed(2);
};
export const assets: { [asset: string]: Asset } = {
    Aurora: {
        name: "Aurora",
        symbol: "AURORA",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromCoinGecko("aurora-near"), 8),
        oracle: {
            name: "AURORAUSD",
            description: "AURORA/USD",
        },
        cFactor: 0.75,
        mintAmount: 10_000_000,
    },
    USDC: {
        name: "USDC",
        symbol: "USDC",
        decimals: 6,
        price: async () => {
            return toFixedPoint("1", 8);
        },
        oracle: {
            name: "USD",
            description: "/USD",
        },
        cFactor: 0.95,
        mintAmount: 100_000_000,
    },
    OP: {
        name: "OP",
        symbol: "OP",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromCoinGecko("optimism"), 8),
        oracle: {
            name: "OPUSD",
            description: "OP/USD",
        },
        cFactor: 0.75,
        mintAmount: 10_000_000,
    },
    WETH: {
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromTwelveData("ETH"), 8),
        oracle: {
            name: "ETHUSD",
            description: "ETH/USD",
        },
        cFactor: 0.8,
        mintAmount: 10_000,
    },
    WNEAR: {
        name: "Wrapped Near",
        symbol: "WNEAR",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromTwelveData("NEAR"), 8),
        oracle: {
            name: "NEARUSD",
            description: "NEAR/USD",
        },
        cFactor: 0.75,
        mintAmount: 10_000_000,
    },
    krTSLA: {
        name: "Tesla, Inc.",
        symbol: "krTSLA",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromTwelveData("TSLA"), 8),
        oracle: {
            name: "TSLAUSD",
            description: "TSLA/USD",
        },
        kFactor: 1.25,
        mintAmount: 1000,
    },
    krQQQ: {
        name: "Invesco QQQ Trust",
        symbol: "krQQQ",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromTwelveData("QQQ"), 8),
        oracle: {
            name: "QQQUSD",
            description: "QQQ/USD",
        },
        kFactor: 1.2,
        mintAmount: 2000,
    },
    krIAU: {
        name: "iShares Gold Trust",
        symbol: "krIAU",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromTwelveData("IAU"), 8),
        oracle: {
            name: "GOLDUSD",
            description: "GOLD/USD",
        },
        kFactor: 1.1,
        cFactor: 0.75,
        mintAmount: 20000,
    },
    krGME: {
        name: "GameStop Corp.",
        symbol: "krGME",
        decimals: 18,
        price: async () => toFixedPoint(await getPriceFromTwelveData("GME"), 8),
        oracle: {
            name: "GMEUSD",
            description: "GME/USD",
        },
        kFactor: 1.25,
        mintAmount: 4000,
    },
};

const defaultParams: Omit<KreskoConstructor, "feeRecipient"> = {
    burnFee: "0.015",
    liquidationIncentive: "1.1",
    minimumCollateralizationRatio: "1.5",
    secondsUntilStalePrice: "60",
    minimumDebtValue: "10",
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
        collaterals: [assets.USDC, assets.OP, assets.Aurora, assets.WETH, assets.WNEAR, assets.krIAU],
        krAssets: [assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.OP],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
    localhost: {
        protocolParams: defaultParams,
        collaterals: [assets.USDC, assets.OP, assets.Aurora, assets.WETH, assets.WNEAR, assets.krIAU],
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
