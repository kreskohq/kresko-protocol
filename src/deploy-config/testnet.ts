import { getPriceFromCoinGecko, getPriceFromTwelveData, toBig } from "@kreskolabs/lib";
import type { Asset, NetworkConfig, StakingPoolConfig, GnosisSafeDeployment } from "types";

import {
    CompatibilityFallbackHandler,
    CreateCall,
    GnosisSafeL2,
    GnosisSafe,
    MultiSendCallOnly,
    MultiSend,
    ProxyFactory,
    SignMessageLib,
    SimulateTxAccessor,
} from "./gnosis-safe";

export const assets: { [asset: string]: Asset } = {
    DAI: {
        name: "Dai",
        symbol: "DAI",
        decimals: 18,
        price: async () => {
            return toBig("1", 8);
        },
        marketOpen: async () => {
            return true;
        },
        oracle: {
            name: "USD",
            description: "/USD",
        },
        cFactor: 0.9,
        mintAmount: 2_000_000_000,
        testAsset: true,
    },
    OP: {
        name: "OP",
        symbol: "OP",
        decimals: 18,
        price: async () => toBig(await getPriceFromCoinGecko("optimism"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: {
            name: "OPUSD",
            description: "OP/USD",
        },
        cFactor: 0.8,
        mintAmount: 50_000_000,
        testAsset: true,
    },
    WETH: {
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        price: async () => toBig(await getPriceFromCoinGecko("ethereum"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: {
            name: "ETHUSD",
            description: "ETH/USD",
        },
        cFactor: 0.9,
        mintAmount: 100_000,
        testAsset: true,
    },
    SNX: {
        name: "Synthethix",
        symbol: "SNX",
        decimals: 18,
        price: async () => toBig(await getPriceFromCoinGecko("havven"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: {
            name: "SNXUSD",
            description: "SNX/USD",
        },
        cFactor: 0.8,
        mintAmount: 5_000_000,
        testAsset: true,
    },
    // KRASSETS
    KISS: {
        name: "KISS",
        symbol: "KISS",
        decimals: 18,
        price: async () => {
            return toBig("1", 8);
        },
        marketOpen: async () => {
            return true;
        },
        oracle: {
            name: "USD",
            description: "/USD",
        },
        cFactor: 0.9,
        kFactor: 1,
        mintAmount: 500_000_000,
    },
    krETH: {
        name: "krETH",
        symbol: "krETH",
        decimals: 18,
        price: async () => toBig(await getPriceFromCoinGecko("ethereum"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: {
            name: "ETHUSD",
            description: "ETH/USD",
        },
        kFactor: 1.2,
        cFactor: 1,
        mintAmount: 15_000,
    },
    krTSLA: {
        name: "Tesla, Inc.",
        symbol: "krTSLA",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("TSLA"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: {
            name: "TSLAUSD",
            description: "TSLA/USD",
        },
        kFactor: 1.2,
        cFactor: 1,
        mintAmount: 25_000,
    },
    krQQQ: {
        name: "Invesco QQQ Trust",
        symbol: "krQQQ",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("QQQ"), 8),
        marketOpen: async () => {
            return true;  // TODO:
        },
        oracle: {
            name: "QQQUSD",
            description: "QQQ/USD",
        },
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 40_000,
    },
    krIAU: {
        name: "iShares Gold Trust",
        symbol: "krIAU",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("IAU"), 8),
        marketOpen: async () => {
            return true;  // TODO:
        },
        oracle: {
            name: "GOLDUSD",
            description: "GOLD/USD",
        },
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 250_000,
    },
    krGME: {
        name: "GameStop Corp.",
        symbol: "krGME",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("GME"), 8),
        marketOpen: async () => {
            return true;  // TODO:
        },
        oracle: {
            name: "GMEUSD",
            description: "GME/USD",
        },
        kFactor: 1.2,
        cFactor: 1,
        mintAmount: 80_000,
    },
};

const defaultParams: Omit<KreskoConstructor, "feeRecipient"> = {
    liquidationIncentive: "1.1",
    minimumCollateralizationRatio: "1.5",
    minimumDebtValue: "10",
    minimumLiquidationThreshold: "1.5",
    liquidationThreshold: "1.4",
};

const defaultPools: [Asset, Asset, number][] = [
    [assets.KISS, assets.krETH, assets.krETH.mintAmount],
    [assets.KISS, assets.krTSLA, assets.krTSLA.mintAmount],
    [assets.KISS, assets.krIAU, assets.krIAU.mintAmount],
    [assets.KISS, assets.krGME, assets.krGME.mintAmount],
    [assets.KISS, assets.krQQQ, assets.krQQQ.mintAmount],
    [assets.KISS, assets.WETH, 17_500],
    [assets.KISS, assets.DAI, 200_000_000],
    [assets.WETH, assets.DAI, 50_000_000],
    [assets.WETH, assets.OP, assets.OP.mintAmount],
];

const defaultStakingPools: StakingPoolConfig[] = [
    {
        lpToken: [assets.KISS, assets.DAI],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.WETH],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krETH],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krTSLA],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krGME],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krIAU],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krQQQ],
        allocPoint: 1000,
        startBlock: 0,
    },
];

const defaultGnosisSafeDeploymentsOPGoerli: GnosisSafeDeployment[] = [
    CompatibilityFallbackHandler,
    CreateCall,
    GnosisSafeL2,
    GnosisSafe,
    MultiSendCallOnly,
    MultiSend,
    ProxyFactory,
    SignMessageLib,
    SimulateTxAccessor,
];

export const testnetConfigs: NetworkConfig = {
    hardhat: {
        protocolParams: defaultParams,
        collaterals: [
            assets.OP,
            assets.WETH,
            assets.KISS,
            assets.DAI,
            assets.SNX,
            assets.krETH,
            assets.krTSLA,
            assets.krQQQ,
            assets.krGME,
            assets.krIAU,
        ],
        krAssets: [assets.krTSLA, assets.KISS, assets.krQQQ, assets.krGME, assets.krIAU, assets.krETH],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.DAI, assets.OP],
        rewardTokenAmounts: [100_000_000, 100_000_000],
        rewardsPerBlock: [0.04, 0.03],
    },
    localhost: {
        protocolParams: defaultParams,
        collaterals: [
            assets.OP,
            assets.WETH,
            assets.KISS,
            assets.DAI,
            assets.SNX,
            assets.krETH,
            assets.krTSLA,
            assets.krQQQ,
            assets.krGME,
            assets.krIAU,
        ],
        krAssets: [assets.krTSLA, assets.KISS, assets.krQQQ, assets.krGME, assets.krIAU, assets.krETH],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.DAI, assets.OP],
        rewardTokenAmounts: [100_000_000, 100_000_000],
        rewardsPerBlock: [0.04, 0.03],
    },
    opgoerli: {
        protocolParams: defaultParams,
        collaterals: [
            assets.OP,
            assets.WETH,
            assets.KISS,
            assets.DAI,
            assets.SNX,
            assets.krETH,
            assets.krTSLA,
            assets.krQQQ,
            assets.krGME,
            assets.krIAU,
        ],
        krAssets: [assets.krTSLA, assets.KISS, assets.krQQQ, assets.krGME, assets.krIAU, assets.krETH],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.DAI, assets.OP],
        rewardTokenAmounts: [100_000_000, 100_000_000],
        rewardsPerBlock: [0.1, 0.075],
        gnosisSafeDeployments: defaultGnosisSafeDeploymentsOPGoerli,
    },
    auroratest: {
        protocolParams: defaultParams,
        collaterals: [assets.KISS, assets.Aurora, assets.WETH, assets.WNEAR],
        krAssets: [assets.KISS, assets.krTSLA, assets.krQQQ, assets.krGME, assets.krIAU],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.WNEAR, assets.Aurora],
        rewardTokenAmounts: [50_000_000, 100_000_000],
        rewardsPerBlock: [0.025, 0.05],
    },
};
