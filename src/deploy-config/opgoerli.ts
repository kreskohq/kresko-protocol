import { getPriceFromCoinGecko, getPriceFromTwelveData, toBig } from "@kreskolabs/lib";
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
    EURO: {
        name: "EURUSD",
        description: "EUR/USD",
        chainlink: "0x619AeaaF08dF3645e138C611bddCaE465312Ef6B",
        createFlux: false,
    },
    DAI: {
        name: "DAI/USD",
        description: "DAI/USD",
        chainlink: "0x31856c9a2A73aAee6100Aed852650f75c5F539D0",
        createFlux: false,
    },
    AMC: {
        name: "AMC/USD",
        description: "AMC/USD",
        createFlux: true,
    },
    QQQ: {
        name: "QQQ/USD",
        description: "QQQ/USD",
        createFlux: true,
    },
    IAU: {
        name: "IAU/USD",
        description: "IAU/USD",
        createFlux: true,
    },
    AAPL: {
        name: "AAPL/USD",
        description: "AAPL/USD",
        createFlux: true,
    },
    USO: {
        name: "USO/USD",
        description: "USO/USD",
        createFlux: true,
    },
    BABA: {
        name: "BABA/USD",
        description: "BABA/USD",
        createFlux: true,
    },
    MSTR: {
        name: "MSTR/USD",
        description: "MSTR/USD",
        createFlux: true,
    },
    OP: {
        name: "OP/USD",
        description: "OP/USD",
        createFlux: true,
    },
    GME: {
        name: "GME/USD",
        description: "GME/USD",
        createFlux: true,
    },
    COIN: {
        name: "COIN/USD",
        description: "COIN/USD",
        createFlux: true,
    },
    BTC: {
        name: "BTCUSD",
        description: "BTC/USD",
        chainlink: "0xC16679B963CeB52089aD2d95312A5b85E318e9d2",
        createFlux: false,
    },
    TSLA: {
        name: "TSLAUSD",
        description: "TSLA/USD",
        createFlux: true,
        // chainlink: "0x3D8faBBa4D954326AaF04E6dc8Dbae6Ab4EcF2E4",
    },
    USDT: {
        name: "USDT/USD",
        description: "USDT/USD",
        chainlink: "0x2e2147bCd571CE816382485E59Cd145A2b7CA451",
        createFlux: false,
    },
    ETH: {
        name: "ETHUSD",
        description: "ETH/USD",
        chainlink: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
        createFlux: true,
        price: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        marketOpen: async () => {
            return true;
        },
    },
    SNX: {
        name: "SNXUSD",
        description: "SNX/USD",
        chainlink: "0x89A7630f46B8c35A7fBBC4f6e4783f1E2DC715c6",
        createFlux: false,
    },
    KISS: {
        name: "KISSUSD",
        description: "KISS/USD",
        createFlux: false, // created separately
        price: async () => {
            return toBig("1", 8);
        },
        marketOpen: async () => {
            return true;
        },
    },
    WTI: {
        name: "WTIUSD",
        description: "WTI/USD",
        chainlink: "0xf3d88dBea0ea9DB336773EDe5Cc9bb3BB89Bc418",
        createFlux: true,
    },
    XAU: {
        name: "XAUUSD",
        description: "XAU/USD",
        chainlink: "0xA8828D339CEFEBf99934e5fdd938d1B4B9730bc3",
        createFlux: false,
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
        mintAmount: 5000,
        testAsset: true,
    },
    OP: {
        name: "OP",
        symbol: "OP",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("OPm/USD"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.OP,
        cFactor: 0.9,
        mintAmount: 5000,
        testAsset: true,
    },
    wBTC: {
        name: "Wrapped Bitcoin",
        symbol: "wBTC",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("BTC/USD"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.BTC,
        cFactor: 0.9,
        mintAmount: 415,
        testAsset: true,
    },
    SNX: {
        name: "Synthetix",
        symbol: "SNX",
        decimals: 18,
        price: async () => toBig(await getPriceFromCoinGecko("havven"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.SNX,
        cFactor: 0.8,
        mintAmount: 0,
        testAsset: true,
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
    krEUR: {
        name: "Euro",
        symbol: "krEURO",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("EUR"), 8),
        marketOpen: async () => {
            return true;
        },
        oracle: oracles.EURO,
        kFactor: 1,
        cFactor: 1,
        mintAmount: 10_000_000,
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
    krTSLA: {
        name: "Tesla, Inc.",
        symbol: "krTSLA",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("TSLA"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.TSLA,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 200,
    },
    krWTI: {
        name: "West Texas Intermediate, Crude Oil",
        symbol: "krWTI",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("WTI/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.WTI,
        kFactor: 1.05,
        cFactor: 1,
        mintAmount: 650,
    },
    krXAU: {
        name: "Gold Ounce",
        symbol: "krXAU",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("XAU/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.XAU,
        kFactor: 1.05,
        cFactor: 1,
        mintAmount: 27,
    },
    krBABA: {
        name: "Alibaba Group Holding Ltd",
        symbol: "krBABA",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("WTI/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.BABA,
        kFactor: 1.05,
        cFactor: 1,
        mintAmount: 5700,
    },
    krMSTR: {
        name: "MicroStrategy Inc",
        symbol: "krMSTR",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("WTI/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.MSTR,
        kFactor: 1.15,
        cFactor: 1,
        mintAmount: 1885,
    },
    krGME: {
        name: "GameStop Corp",
        symbol: "krGME",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("WTI/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.GME,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 25_000,
    },
    krQQQ: {
        name: "Invesco QQQ Trust Series 1",
        symbol: "krQQQ",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("WTI/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.QQQ,
        kFactor: 1.05,
        cFactor: 1,
        mintAmount: 1700,
    },
    krCOIN: {
        name: "Coinbase Global",
        symbol: "krCOIN",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("COIN"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.COIN,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 1,
    },
    krAAPL: {
        name: "Apple Inc.",
        symbol: "krAAPL",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("AAPL"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.AAPL,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 1,
    },
    krAMC: {
        name: "AMC Entertainment Holdings Inc.",
        symbol: "krAMC",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("AMC"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.AMC,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 1,
    },
    krIAU: {
        name: "iShares Gold Trust",
        symbol: "krIAU",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("IAU"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.IAU,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 1,
    },
    krUSO: {
        name: "United States Oil Fund",
        symbol: "krUSO",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("USO"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.USO,
        kFactor: 1.1,
        cFactor: 1,
        mintAmount: 1,
    },
    krETHRATE: {
        name: "Stability Rate Test Token",
        symbol: "krETHRATE",
        decimals: 18,
        price: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        marketOpen: async () => {
            return true; // TODO:
        },
        oracle: oracles.ETH,
        kFactor: 1.05,
        cFactor: 1,
        mintAmount: 0,
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
    [assets.KISS, assets.krTSLA, assets.krTSLA.mintAmount!],
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
