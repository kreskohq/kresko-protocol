import { getPriceFromTwelveData, toBig } from "@kreskolabs/lib";
import { ethers } from "ethers";
import { Asset, GnosisSafeDeployment, NetworkConfig } from "types";
import {
    CompatibilityFallbackHandler,
    CreateCall,
    GnosisSafe,
    GnosisSafeL2,
    MultiSend,
    MultiSendCallOnly,
    ProxyFactory,
    SignMessageLib,
    SimulateTxAccessor,
} from "./gnosis-safe";

const defaultParams: Omit<KreskoConstructor, "feeRecipient"> = {
    extOracleDecimals: 8,
    minCollateralRatio: 1.5,
    minDebtValue: 10,
    liquidationThreshold: 1.4,
    oracleDeviationPct: 0.1,
    sequencerGracePeriodTime: 3600,
    sequencerUptimeFeed: "0x4da69F028a5790fCCAfe81a75C0D24f46ceCDd69",
    oracleTimeout: ethers.constants.MaxUint256,
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
        chainlink: "0x1A604cF2957Abb03ce62a6642fd822EbcE15166b",
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
        name: "Kresko Asset: Bitcoin",
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
        name: "Kresko Asset: Ether",
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
        collaterals: [assets.KISS, assets.krETH],
        krAssets: [assets.KISS, assets.krETH],
        gnosisSafeDeployments,
    },
    localhost: {
        protocolParams: defaultParams,
        collaterals: [assets.DAI, assets.KISS, assets.krBTC, assets.krETH],
        krAssets: [assets.KISS, assets.krBTC, assets.krETH],
        gnosisSafeDeployments,
    },
    arbitrumGoerli: {
        protocolParams: defaultParams,
        collaterals: [assets.DAI, assets.KISS, assets.krBTC, assets.krETH],
        krAssets: [assets.KISS, assets.krBTC, assets.krETH],
        gnosisSafeDeployments,
    },
};
