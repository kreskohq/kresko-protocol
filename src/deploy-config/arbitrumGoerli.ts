import { getPriceFromTwelveData, toBig } from "@kreskolabs/lib";
import { Asset, GnosisSafeDeployment, NetworkConfig, StakingPoolConfig } from "types";
import {
    CompatibilityFallbackHandler,
    CreateCall,
    MultiSendCallOnly,
    MultiSend,
    GnosisSafeL2,
    GnosisSafe,
    ProxyFactory,
    SignMessageLib,
    SimulateTxAccessor,
} from "./gnosis-safe";
import { ethers } from "ethers";

const defaultParams: Omit<KreskoConstructor, "feeRecipient"> = {
    liquidationIncentive: "1.05",
    minimumCollateralizationRatio: "1.5",
    minimumDebtValue: "10",
    liquidationThreshold: "1.4",
};

export const redstoneMap = {
    krETH: ethers.utils.formatBytes32String("ETH"),
    krBTC: ethers.utils.formatBytes32String("BTC"),
    krTSLA: ethers.utils.formatBytes32String("TSLA"),
    WETH: ethers.utils.formatBytes32String("ETH"),
    ETH: ethers.utils.formatBytes32String("ETH"),
    WBTC: ethers.utils.formatBytes32String("BTC"),
    KISS: ethers.utils.formatBytes32String("USDC"),
    DAI: ethers.utils.formatBytes32String("DAI"),
    USDC: ethers.utils.formatBytes32String("USDC"),
    Collateral: ethers.utils.formatBytes32String("USDC"),
    KreskoAsset: ethers.utils.formatBytes32String("USDC"),
    KreskoAssetPrice10USD: ethers.utils.formatBytes32String("USDC"),
    CollateralAsset: ethers.utils.formatBytes32String("USDC"),
    Collateral18Dec: ethers.utils.formatBytes32String("USDC"),
    Collateral8Dec: ethers.utils.formatBytes32String("USDC"),
    Collateral21Dec: ethers.utils.formatBytes32String("USDC"),
    KreskoAssetLiquidation: ethers.utils.formatBytes32String("USDC"),
    SecondKreskoAsset: ethers.utils.formatBytes32String("USDC"),
    krasset2: ethers.utils.formatBytes32String("USDC"),
    krasset3: ethers.utils.formatBytes32String("USDC"),
    krasset4: ethers.utils.formatBytes32String("USDC"),
    quick: ethers.utils.formatBytes32String("USDC"),
};

export const oracles = {
    ARB: {
        name: "ARB/USD",
        description: "ARB/USD",
        chainlink: "0x2eE9BFB2D319B31A573EA15774B755715988E99D",
    },
    DAI: {
        name: "DAI/USD",
        description: "DAI/USD",
        chainlink: "0x103b53E977DA6E4Fa92f76369c8b7e20E7fb7fe1",
    },
    BTC: {
        name: "BTCUSD",
        description: "BTC/USD",
        chainlink: "0x6550bc2301936011c1334555e62A87705A81C12C",
    },
    USDT: {
        name: "USDT/USD",
        description: "USDT/USD",
        chainlink: "0x0a023a3423D9b27A0BE48c768CCF2dD7877fEf5E",
    },
    USDC: {
        name: "USDC/USD",
        description: "USDC/USD",
        chainlink: "0x1692Bdd32F31b831caAc1b0c9fAF68613682813b",
    },
    ETH: {
        name: "ETHUSD",
        description: "ETH/USD",
        chainlink: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08",
        price: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        marketOpen: async () => {
            return true;
        },
    },
    KISS: {
        name: "KISSUSD",
        description: "KISS/USD",
        price: async () => {
            return toBig("1", 8);
        },
        marketOpen: async () => {
            return true;
        },
    },
};

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
        oracle: oracles.DAI,
        cFactor: 0.9,
        mintAmount: 150_000_000,
        testAsset: true,
    },
    WETH: {
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.ETH,
        cFactor: 0.9,
    },
    // KRASSETS
    KISS: {
        name: "Kresko Integrated Stable System",
        symbol: "KISS",
        decimals: 18,
        price: async () => {
            return toBig("1", 8);
        },
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.KISS,
        cFactor: 0.95,
        kFactor: 1,
        mintAmount: 50_000_000,
    },
    krBTC: {
        name: "Bitcoin",
        symbol: "krBTC",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("BTC/USD"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.BTC,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 5,
    },
    krETH: {
        name: "Ethereum",
        symbol: "krETH",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.ETH,
        kFactor: 1.05,
        cFactor: 1,
        mintAmount: 64,
    },
    krCUBE: {
        name: "krCUBE",
        symbol: "krCUBE",
        decimals: 18,
        mintAmount: 1_000_000,
    },
};

const defaultPools: [Asset, Asset, number][] = [
    [assets.KISS, assets.DAI, 2_500_500!],
    [assets.KISS, assets.krETH, assets.krETH.mintAmount!],
    [assets.KISS, assets.krBTC, assets.krTSLA.mintAmount!],
];

const defaultStakingPools: StakingPoolConfig[] = [
    {
        lpToken: [assets.KISS, assets.DAI],
        allocPoint: 1500,
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
];

const gnosisSafeDeployments: GnosisSafeDeployment[] = [
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
        collaterals: [assets.WETH, assets.DAI, assets.krETH, assets.krTSLA],
        krAssets: [assets.krTSLA, assets.krETH],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.krCUBE],
        rewardTokenAmounts: [1_000_000],
        rewardsPerBlock: [0.02],
        gnosisSafeDeployments,
    },
    localhost: {
        protocolParams: defaultParams,
        collaterals: [assets.WETH, assets.DAI, assets.krETH, assets.krTSLA],
        krAssets: [assets.krTSLA, assets.krETH],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.krCUBE],
        rewardTokenAmounts: [1_000_000],
        rewardsPerBlock: [0.02],
        gnosisSafeDeployments,
    },
    opgoerli: {
        protocolParams: defaultParams,
        collaterals: [assets.DAI, assets.KISS, assets.krBTC, assets.WETH, assets.krTSLA, assets.krETH],
        krAssets: [assets.KISS, assets.krBTC, assets.krTSLA, assets.krETH],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.krCUBE],
        rewardTokenAmounts: [1_000_000],
        rewardsPerBlock: [0.02],
        gnosisSafeDeployments,
    },
};
