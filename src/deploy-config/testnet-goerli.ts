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

const defaultParams: Omit<KreskoConstructor, "feeRecipient"> = {
    liquidationIncentive: "1.05",
    minimumCollateralizationRatio: "1.5",
    minimumDebtValue: "10",
    liquidationThreshold: "1.4",
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
    krREWARD: {
        name: "Kresko Testnet Staking Reward",
        symbol: "krREWARD",
        decimals: 18,
        mintAmount: 1_000_000,
    },
};

const defaultPools: [Asset, Asset, number][] = [
    [assets.KISS, assets.krETH, assets.krETH.mintAmount!],
    // [assets.KISS, assets.krTSLA, assets.krTSLA.mintAmount],
    [assets.KISS, assets.krXAU, assets.krXAU.mintAmount!],
    [assets.KISS, assets.krWTI, assets.krWTI.mintAmount!],
    [assets.KISS, assets.krBTC, assets.krBTC.mintAmount!],
    [assets.KISS, assets.WETH, 3500],
    [assets.KISS, assets.DAI, 20_000_000],
    [assets.WETH, assets.DAI, 10_000_000],
];

const defaultStakingPools: StakingPoolConfig[] = [
    {
        lpToken: [assets.KISS, assets.DAI],
        allocPoint: 750,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.WETH],
        allocPoint: 500,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krETH],
        allocPoint: 750,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krTSLA],
        allocPoint: 1000,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krXAU],
        allocPoint: 750,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krWTI],
        allocPoint: 750,
        startBlock: 0,
    },
    {
        lpToken: [assets.KISS, assets.krBTC],
        allocPoint: 750,
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
            assets.DAI,
            assets.krBTC,
            assets.WETH,
            assets.SNX,
            assets.krETH,
            assets.krWTI,
            assets.krXAU,
            assets.krTSLA,
            assets.krETHRATE,
        ],
        krAssets: [assets.krTSLA, assets.krWTI, assets.krBTC, assets.krXAU, assets.krETH, assets.krETHRATE],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.krREWARD],
        rewardTokenAmounts: [1_000_000],
        rewardsPerBlock: [0.02],
        gnosisSafeDeployments: defaultGnosisSafeDeploymentsOPGoerli,
    },
    localhost: {
        protocolParams: defaultParams,
        collaterals: [
            assets.DAI,
            assets.krBTC,
            assets.WETH,
            assets.SNX,
            assets.krETH,
            assets.krWTI,
            assets.krXAU,
            assets.krTSLA,
            assets.krETHRATE,
        ],
        krAssets: [assets.krTSLA, assets.krWTI, assets.krBTC, assets.krXAU, assets.krETH, assets.krETHRATE],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.krREWARD],
        rewardTokenAmounts: [1_000_000],
        rewardsPerBlock: [0.02],
        gnosisSafeDeployments: defaultGnosisSafeDeploymentsOPGoerli,
    },
    opgoerli: {
        protocolParams: defaultParams,
        collaterals: [
            assets.DAI,
            assets.krBTC,
            assets.WETH,
            assets.SNX,
            assets.krETH,
            assets.krWTI,
            assets.krXAU,
            assets.krTSLA,
            assets.krETHRATE,
        ],
        krAssets: [assets.krTSLA, assets.krWTI, assets.krBTC, assets.krXAU, assets.krETH, assets.krETHRATE],
        pools: defaultPools,
        stakingPools: defaultStakingPools,
        rewardTokens: [assets.krREWARD],
        rewardTokenAmounts: [1_000_000],
        rewardsPerBlock: [0.02],
        gnosisSafeDeployments: defaultGnosisSafeDeploymentsOPGoerli,
    },
};
