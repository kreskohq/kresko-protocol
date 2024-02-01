import type { MockPyth } from '@/types/typechain'
import { PromiseOrValue } from '@/types/typechain/common'
import { PythViewStruct } from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { assets } from '@config/hardhat/deploy/arbitrumSepolia'
import { BytesLike } from 'ethers'
import { formatBytesString } from './values'

export const getMockPythPayload = (
  mockPyth: MockPyth,
  values?: { id: PromiseOrValue<BytesLike> | string; value: number }[],
) => {
  if (!values?.length) {
    values = defaults
  }

  values = values.map(v => ({
    id: String(v.id).startsWith('0x') ? v.id : formatBytesString(String(v.id), 32),
    value: v.value < 1e6 ? v.value * 1e8 : v.value,
  }))

  return mockPyth.getMockPayload(
    values.map(v => v.id),
    values.map(v => v.value.ebn(0)),
  )
}

export const getMockPythPriceView = (
  values?: { id: PromiseOrValue<BytesLike> | string; value: number }[],
): PythViewStruct => {
  if (!values?.length) {
    values = defaults
  }
  values = values.map(v => ({
    id: String(v.id).startsWith('0x') ? v.id : formatBytesString(String(v.id), 32),
    value: v.value < 1e6 ? v.value * 1e8 : v.value,
  }))

  return {
    ids: values.map(v => v.id),
    prices: values.map(v => ({
      price: v.value.ebn(0),
      conf: (0.0001e8).ebn(0),
      exp: -8,
      timestamp: Math.floor(Date.now() / 1000).ebn(0),
    })),
  }
}

export type TestAssetIds = TestTokenSymbols
export const TickerMap = {
  krETH: 'ETH',
  krBTC: 'BTC',
  krTSLA: 'TSLA',
  WETH: 'ETH',
  ETH: 'ETH',
  WBTC: 'BTC',
  KISS: 'KISS',
  DAI: 'DAI',
  USDC: 'USDC',
  USDT: 'USDT',
  TSLA: 'TSLA',
  BTC: 'BTC',
  Coll8Dec: 'Coll8Dec',
  Coll21Dec: 'Coll21Dec',
  Coll18Dec: 'Coll18Dec',
  Collateral: 'Collateral',
  Collateral2: 'Collateral2',
  Collateral3: 'Collateral3',
  Collateral4: 'Collateral4',
  KrAsset: 'KrAsset',
  KrAsset2: 'KrAsset2',
  KrAsset3: 'KrAsset3',
  KrAsset4: 'KrAsset4',
  KrAsset5: 'KrAsset5',
}

export const defaults = [
  { id: 'DAI', value: 1e8 },
  { id: 'USDC', value: 1e8 },
  { id: 'USDT', value: 1e8 },
  { id: 'ETH', value: 2000e8 },
  { id: 'BTC', value: 40000e8 },
  { id: 'KISS', value: 1e8 },
  { id: 'TSLA', value: 240e8 },
  { id: 'Coll8Dec', value: 10e8 },
  { id: 'Coll18Dec', value: 10e8 },
  { id: 'Coll21Dec', value: 10e8 },
  { id: 'Collateral', value: 10e8 },
  { id: 'Collateral2', value: 10e8 },
  { id: 'Collateral3', value: 10e8 },
  { id: 'Collateral4', value: 10e8 },
  { id: 'KrAsset', value: 10e8 },
  { id: 'KrAsset2', value: 10e8 },
  { id: 'KrAsset3', value: 10e8 },
  { id: 'KrAsset4', value: 10e8 },
  { id: 'KrAsset5', value: 10e8 },
]

export type AllTickers = TestAssetIds | 'ETH' | typeof assets[keyof typeof assets]['ticker']
