import { type AssetArgs, type GnosisSafeDeployment, type NetworkConfig, OracleType } from '@/types'
import { defaultSupplyLimit } from '@utils/test/mocks'
import pyth_ids from 'utils/pyth_stable_ids.json'
import {
  CompatibilityFallbackHandler,
  CreateCall,
  DeploymentFactory,
  GnosisSafe,
  GnosisSafeL2,
  MultiSend,
  MultiSendCallOnly,
  SignMessageLib,
  SimulateTxAccessor,
} from '../../../src/utils/gnosis/gnosis-safe'

import type {
  CommonInitArgsStruct,
  MinterInitArgsStruct,
  SCDPInitArgsStruct,
} from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { priceTW, toBig } from '@utils/values'
import { zeroAddress } from 'viem'

const pricesMock = {
  'ARB/USD': 1.1,
  'ETH/USD': 2000,
  'BTC/USD': 50000,
  'DAI/USD': 1,
  'USDC/USD': 1,
  'USDT/USD': 1,
  'KISS/USD': 1,
}
const price = async (symbol: keyof typeof pricesMock) => {
  if (!process.env.TWELVEDATA_API_KEY) {
    return toBig(pricesMock[symbol], 8)
  } else {
    return toBig(await priceTW(symbol), 8)
  }
}

export const oracles = {
  ARB: {
    name: 'ARB/USD',
    description: 'ARB/USD',
    chainlink: '0xD1092a65338d049DB68D7Be6bD89d17a0929945e',
  },
  DAI: {
    name: 'DAI/USD',
    description: 'DAI/USD',
    chainlink: '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61',
  },
  BTC: {
    name: 'BTCUSD',
    description: 'BTC/USD',
    chainlink: '0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69',
  },
  USDT: {
    name: 'USDT/USD',
    description: 'USDT/USD',
    chainlink: '0x0153002d20B96532C639313c2d54c3dA09109309',
  },
  USDC: {
    name: 'USDC/USD',
    description: 'USDC/USD',
    chainlink: '0x0153002d20B96532C639313c2d54c3dA09109309',
  },
  ETH: {
    name: 'ETHUSD',
    description: 'ETH/USD',
    chainlink: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
    price: async () => price('ETH/USD'),
    marketOpen: async () => {
      return true
    },
  },
  KISS: {
    name: 'KISSUSD',
    description: 'KISS/USD',
    price: async () => {
      return toBig('1', 8)
    },
    marketOpen: async () => {
      return true
    },
    chainlink: '0x1A604cF2957Abb03ce62a6642fd822EbcE15166b',
  },
}

export type AssetConfigExtended = AssetArgs & {
  getMarketOpen: () => Promise<boolean>
  getPrice: () => Promise<BigNumber>
  mintAmount?: number
}
export const assets = {
  DAI: {
    ticker: 'DAI',
    name: 'Dai',
    symbol: 'DAI',
    decimals: 18,
    oracleIds: [OracleType.Pyth, OracleType.Chainlink] as const,
    getPrice: async () => toBig('1', 8),
    getMarketOpen: async () => {
      return true
    },
    feed: oracles.DAI.chainlink,
    staletimes: [10000, 86401],
    pyth: {
      id: pyth_ids.DAI,
      invert: false,
    },
    collateralConfig: {
      cFactor: 0.9e4,
      liqIncentive: 1.05e4,
    },
    mintAmount: 1_000_000,
  },
  WETH: {
    ticker: 'ETH',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    oracleIds: [OracleType.Pyth, OracleType.Chainlink] as const,
    getPrice: async () => price('ETH/USD'),
    getMarketOpen: async () => true,
    feed: oracles.ETH.chainlink,
    staletimes: [10000, 86401],
    pyth: {
      id: pyth_ids.ETH,
      invert: false,
    },
    collateralConfig: {
      cFactor: 0.9e4,
      liqIncentive: 1.05e4,
    },
  },
  // KRASSETS
  KISS: {
    ticker: 'KISS',
    name: 'Kresko Integrated Stable System',
    symbol: 'KISS',
    decimals: 18,
    oracleIds: [OracleType.Vault, OracleType.Empty] as const,
    getPrice: async () => toBig('1', 8),
    getMarketOpen: async () => true,
    pyth: {
      id: null,
      invert: false,
    },
    staletimes: [86401, 0],
    collateralConfig: {
      cFactor: 0.95e4,
      liqIncentive: 1.05e4,
    },
    krAssetConfig: {
      anchor: null,
      underlyingAddr: zeroAddress,
      kFactor: 1.1e4,
      openFee: 0,
      closeFee: 0,
      maxDebtMinter: defaultSupplyLimit,
    },
    scdpKrAssetConfig: {
      swapInFeeSCDP: 0,
      swapOutFeeSCDP: 0.02e4,
      protocolFeeShareSCDP: 0.005e4,
      liqIncentiveSCDP: 1.05e4,
      maxDebtSCDP: defaultSupplyLimit,
    },
    mintAmount: 50_000_000,
  },
  krBTC: {
    ticker: 'BTC',
    name: 'Bitcoin',
    symbol: 'krBTC',
    decimals: 18,
    oracleIds: [OracleType.Pyth, OracleType.Chainlink] as const,
    getPrice: async () => price('BTC/USD'),
    getMarketOpen: async () => true,
    feed: oracles.BTC.chainlink,
    pyth: {
      id: pyth_ids.BTC,
      invert: false,
    },
    staletimes: [10000, 86401],
    krAssetConfig: {
      anchor: null,
      kFactor: 1.05e4,
      underlyingAddr: zeroAddress,
      openFee: 0,
      closeFee: 0.02e4,
      maxDebtMinter: defaultSupplyLimit,
    },
    collateralConfig: {
      cFactor: 1e4,
      liqIncentive: 1.1e4,
    },
    mintAmount: 5,
  },
  krETH: {
    ticker: 'ETH',
    name: 'Ether',
    symbol: 'krETH',
    decimals: 18,
    oracleIds: [OracleType.Pyth, OracleType.Chainlink] as const,
    getPrice: async () => price('ETH/USD'),
    getMarketOpen: async () => {
      return true
    },
    feed: oracles.ETH.chainlink,
    staletimes: [10000, 86401],
    pyth: {
      id: pyth_ids.ETH,
      invert: false,
    },
    krAssetConfig: {
      anchor: null,
      kFactor: 1.05e4,
      underlyingAddr: zeroAddress,
      openFee: 0,
      closeFee: 0.02e4,
      maxDebtMinter: defaultSupplyLimit,
    },
    collateralConfig: {
      cFactor: 1e4,
      liqIncentive: 1.1e4,
    },
    mintAmount: 64,
  },
} as const

const gnosisSafeDeployments: GnosisSafeDeployment[] = [
  CompatibilityFallbackHandler,
  CreateCall,
  GnosisSafeL2,
  GnosisSafe,
  MultiSendCallOnly,
  MultiSend,
  DeploymentFactory,
  SignMessageLib,
  SimulateTxAccessor,
]
const commonInitAgs = (
  gatingManager: string,
): Omit<CommonInitArgsStruct, 'feeRecipient' | 'admin' | 'council' | 'treasury'> => ({
  oracleDecimals: 8,
  gatingManager,
  maxPriceDeviationPct: 0.1e4,
  sequencerGracePeriodTime: 3600,
  sequencerUptimeFeed: '0x23ab08d87BBAe90e8BDe56F87ad6e53683E08279',
  pythEp: '0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF',
})

export const minterInitArgs: MinterInitArgsStruct = {
  minCollateralRatio: 1.5e4,
  liquidationThreshold: 1.4e4,
  minDebtValue: 10e8,
}
export const scdpInitArgs: SCDPInitArgsStruct = {
  minCollateralRatio: 5e4,
  liquidationThreshold: 2e4,
  coverThreshold: 2.25e4,
  coverIncentive: 1.01e4,
}
export const testnetConfigs: NetworkConfig = {
  all: {
    commonInitAgs: commonInitAgs(zeroAddress),
    minterInitArgs,
    scdpInitArgs,
    assets: [assets.DAI, assets.KISS, assets.WETH, assets.krBTC, assets.krETH],
    gnosisSafeDeployments,
  },
  hardhat: {
    commonInitAgs: commonInitAgs(zeroAddress),
    minterInitArgs,
    scdpInitArgs,
    assets: [assets.KISS, assets.krETH],
    gnosisSafeDeployments,
  },
  localhost: {
    commonInitAgs: commonInitAgs(zeroAddress),
    minterInitArgs,
    scdpInitArgs,
    assets: [assets.DAI, assets.KISS, assets.krBTC, assets.krETH],
    gnosisSafeDeployments,
  },
  arbitrumGoerli: {
    commonInitAgs: commonInitAgs(zeroAddress),
    minterInitArgs,
    scdpInitArgs,
    assets: [assets.DAI, assets.KISS, assets.krBTC, assets.krETH],
    gnosisSafeDeployments,
  },
}
