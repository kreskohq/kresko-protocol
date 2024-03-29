import type { MockOracle, MockPyth } from '@/types/typechain'
import type { PromiseOrValue } from '@/types/typechain/common'
import type { PythViewStruct } from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import type { assets } from '@config/hardhat/deploy/arbitrumSepolia'
import { type FakeContract } from '@defi-wonderland/smock'
import { formatBytesString } from '@utils/values'
import { BigNumber, BytesLike } from 'ethers'
import { TEN_USD } from '../mocks'

const pythPrices = new Map<string, BigNumber>()

export const createOracles = async (
  hre: any,
  pythId: string | null,
  price = TEN_USD,
  marketOpen = true,
): Promise<FakeContract<MockOracle>> => {
  const { smock } = await import('@defi-wonderland/smock')
  const FakeOracle = await smock.fake<MockOracle>('MockOracle')
  FakeOracle.decimals.returns(8)

  await updatePrices(hre, FakeOracle, price, toBytes(pythId))

  return FakeOracle
}

export const updatePrices = async (hre: any, fakeOracle: FakeContract<MockOracle>, price: number, pythId: string) => {
  const priceBn = price.ebn(8)
  const now = Math.floor(Date.now() / 1000)

  pythPrices.set(pythId, priceBn)
  fakeOracle.initialAnswer.returns(priceBn)
  fakeOracle.latestRoundData.returns([1, priceBn, now, now, 1])

  const mockPyth = await hre.getContractOrFork('MockPyth')
  await mockPyth.updatePriceFeeds(await getUpdateData(hre))
}

export const getUpdateData = async (hre: any) => {
  const mockPyth = await hre.getContractOrFork('MockPyth')
  return await mapToUpdateData(mockPyth, Array.from(pythPrices.entries()))
}

export const getViewData = (_hre: any) => {
  return mapToPriceView(Array.from(pythPrices.entries()))
}

export const getPythPrice = (pythId: string) => {
  const price = pythPrices.get(pythId)
  if (!price) {
    throw new Error(`No price for ${pythId}`)
  }
  return price
}

export const addPythPrice = (pythId: string, price: number | BigNumber) => {
  pythPrices.set(toBytes(pythId), price instanceof BigNumber ? price : price.ebn(8))
}
export const clear = () => {
  pythPrices.clear()
}

type PriceConfig = [pythId: PromiseOrValue<BytesLike> | string, price: number | BigNumber][]

export const mapToUpdateData = (mockPyth: MockPyth, values?: PriceConfig) => {
  if (!values?.length) {
    values = defaultPrices
  }

  values = values.map(([pythId, price]) => [toBytes(pythId), price instanceof BigNumber ? price : price.ebn(8)])

  return mockPyth.getMockPayload(
    values.map(v => v[0]),
    values.map(v => v[1]),
  )
}

export const mapToPriceView = (values?: PriceConfig): PythViewStruct => {
  if (!values?.length) {
    values = defaultPrices
  }
  values = values.map(([pythId, price]) => [toBytes(pythId), price instanceof BigNumber ? price : price.ebn(8)])

  return {
    ids: values.map(v => v[0]),
    prices: values.map(v => ({
      price: v[1],
      conf: (0.0001e8).ebn(0),
      exp: -8,
      timestamp: Math.floor(Date.now() / 1000).ebn(0),
    })),
  }
}

export const toBytes = (value: any) => {
  return String(value).startsWith('0x') ? (value as string) : formatBytesString(value ?? '', 32)
}
export type TestAssetIds = TestTokenSymbols
export const TestTickers = {
  krETH: 'ETH',
  krBTC: 'BTC',
  krTSLA: 'TSLA',
  WETH: 'ETH',
  ETH: 'ETH',
  WBTC: 'BTC',
  KISS: 'KISS',
  MockKISS: 'MockKISS',
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

export const defaultPrices: PriceConfig = [
  ['DAI', 1e8],
  ['USDC', 1e8],
  ['USDT', 1e8],
  ['ETH', 2000e8],
  ['BTC', 40000e8],
  ['KISS', 1e8],
  ['MockKISS', 1e8],
  ['TSLA', 240e8],
  ['Coll8Dec', 10e8],
  ['Coll18Dec', 10e8],
  ['Coll21Dec', 10e8],
  ['Collateral', 10e8],
  ['Collateral2', 10e8],
  ['Collateral3', 10e8],
  ['Collateral4', 10e8],
  ['KrAsset', 10e8],
  ['KrAsset2', 10e8],
  ['KrAsset3', 10e8],
  ['KrAsset4', 10e8],
  ['KrAsset5', 10e8],
]

export type AllTickers = TestAssetIds | 'ETH' | (typeof assets)[keyof typeof assets]['ticker']
