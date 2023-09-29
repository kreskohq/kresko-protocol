import { getPriceFromTwelveData } from "@kreskolabs/lib";
import { AssetArgs, GnosisSafeDeployment, NetworkConfig, OracleType } from "types";
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
import { defaultSupplyLimit } from "@utils/test/mocks";
import {
    CommonInitArgsStruct,
    MinterInitArgsStruct,
    SCDPInitArgsStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { ethers } from "ethers";
import { toBig } from "@utils/values";

export const redstoneMap = {
    krETH: "ETH",
    krBTC: "BTC",
    krTSLA: "TSLA",
    WETH: "ETH",
    ETH: "ETH",
    WBTC: "BTC",
    KISS: "USDC",
    DAI: "DAI",
    USDC: "USDC",
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

export type AssetConfigExtended = AssetArgs & {
    getMarketOpen: () => Promise<boolean>;
    getPrice: () => Promise<BigNumber>;
    mintAmount?: number;
};
export const assets = {
    DAI: {
        id: "DAI",
        name: "Dai",
        symbol: "DAI",
        decimals: 18,
        oracleIds: [OracleType.Redstone, OracleType.Chainlink] as const,
        getPrice: async () => toBig("1", 8),
        getMarketOpen: async () => {
            return true;
        },
        feed: oracles.DAI.chainlink,
        collateralConfig: {
            cFactor: 0.9e4,
            liqIncentive: 1.05e4,
        },
        mintAmount: 1_000_000,
    },
    WETH: {
        id: "ETH",
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        oracleIds: [OracleType.Redstone, OracleType.Chainlink] as const,
        getPrice: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        getMarketOpen: async () => true,
        feed: oracles.ETH.chainlink,
        collateralConfig: {
            cFactor: 0.9e4,
            liqIncentive: 1.05e4,
        },
    },
    // KRASSETS
    KISS: {
        id: "KISS",
        name: "Kresko Integrated Stable System",
        symbol: "KISS",
        decimals: 18,
        oracleIds: [OracleType.Redstone, OracleType.Chainlink] as const,
        getPrice: async () => toBig("1", 8),
        getMarketOpen: async () => true,
        feed: oracles.KISS.chainlink,
        collateralConfig: {
            cFactor: 0.95e4,
            liqIncentive: 1.05e4,
        },
        krAssetConfig: {
            anchor: null,
            kFactor: 1.1e4,
            openFee: 0,
            closeFee: 0,
            supplyLimit: defaultSupplyLimit,
        },
        scdpKrAssetConfig: {
            openFeeSCDP: 0,
            closeFeeSCDP: 0.02e4,
            protocolFeeSCDP: 0.005e4,
            liqIncentiveSCDP: 1.05e4,
        },
        mintAmount: 50_000_000,
    },
    krBTC: {
        id: "BTC",
        name: "Kresko Asset: Bitcoin",
        symbol: "krBTC",
        decimals: 18,
        oracleIds: [OracleType.Redstone, OracleType.Chainlink] as const,
        getPrice: async () => toBig(await getPriceFromTwelveData("BTC/USD"), 8),
        getMarketOpen: async () => true,
        feed: oracles.BTC.chainlink,
        krAssetConfig: {
            anchor: null,
            kFactor: 1.05e4,
            openFee: 0,
            closeFee: 0.02e4,
            supplyLimit: defaultSupplyLimit,
        },
        collateralConfig: {
            cFactor: 1e4,
            liqIncentive: 1.1e4,
        },
        mintAmount: 5,
    },
    krETH: {
        id: "ETH",
        name: "Kresko Assets: Ether",
        symbol: "krETH",
        decimals: 18,
        oracleIds: [OracleType.Redstone, OracleType.Chainlink] as const,
        getPrice: async () => toBig(await getPriceFromTwelveData("ETH/USD"), 8),
        getMarketOpen: async () => {
            return true;
        },
        feed: oracles.ETH.chainlink,
        krAssetConfig: {
            anchor: null,
            kFactor: 1.05e4,
            openFee: 0,
            closeFee: 0.02e4,
            supplyLimit: defaultSupplyLimit,
        },
        collateralConfig: {
            cFactor: 1e4,
            liqIncentive: 1.1e4,
        },
        mintAmount: 64,
    },
} as const;

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
const commonInitAgs = (
    gate?: boolean,
): Omit<CommonInitArgsStruct, "feeRecipient" | "admin" | "council" | "treasury"> => ({
    oracleDecimals: 8,
    questForKresk: ethers.constants.AddressZero,
    kreskian: ethers.constants.AddressZero,
    phase: !gate ? 3 : 0, // 0 = phase 1, 1 = phase 2, 2 = phase 3, 3 = no gating (subject to change)
    minDebtValue: 10,
    oracleDeviationPct: 0.1e4,
    sequencerGracePeriodTime: 3600,
    sequencerUptimeFeed: "0x4da69F028a5790fCCAfe81a75C0D24f46ceCDd69",
    oracleTimeout: 6.5e4,
});

export const minterInitArgs: MinterInitArgsStruct = {
    minCollateralRatio: 1.5e4,
    liquidationThreshold: 1.4e4,
};
export const scdpInitArgs: SCDPInitArgsStruct = {
    minCollateralRatio: 1.5e4,
    liquidationThreshold: 1.4e4,
    swapFeeRecipient: "",
};
export const testnetConfigs: NetworkConfig = {
    all: {
        commonInitAgs: commonInitAgs(false),
        minterInitArgs,
        scdpInitArgs,
        assets: [assets.DAI, assets.KISS, assets.WETH, assets.krBTC, assets.krETH],
        gnosisSafeDeployments,
    },
    hardhat: {
        commonInitAgs: commonInitAgs(false),
        minterInitArgs,
        scdpInitArgs,
        assets: [assets.KISS, assets.krETH],
        gnosisSafeDeployments,
    },
    localhost: {
        commonInitAgs: commonInitAgs(false),
        minterInitArgs,
        scdpInitArgs,
        assets: [assets.DAI, assets.KISS, assets.krBTC, assets.krETH],
        gnosisSafeDeployments,
    },
    arbitrumGoerli: {
        commonInitAgs: commonInitAgs(true),
        minterInitArgs,
        scdpInitArgs,
        assets: [assets.DAI, assets.KISS, assets.krBTC, assets.krETH],
        gnosisSafeDeployments,
    },
};
