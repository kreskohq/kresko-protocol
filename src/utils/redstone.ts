import { assets } from '@config/deploy/arbitrumGoerli';
import { WrapperBuilder } from '@redstone-finance/evm-connector';
import { Kresko } from 'types/typechain';

export const wrapKresko = (contract: Kresko, signer?: any) =>
  WrapperBuilder.wrap(signer ? contract.connect(signer) : contract).usingSimpleNumericMock({
    mockSignersCount: 1,
    timestampMilliseconds: Date.now(),
    dataPoints: defaultRedstoneDataPoints,
  }) as Kresko;

type DataPoints = {
  dataFeedId: string;
  value: number;
}[];
export const wrapPrices = (contract: Kresko, prices: DataPoints, signer?: any) =>
  WrapperBuilder.wrap(signer ? contract.connect(signer) : contract).usingSimpleNumericMock({
    mockSignersCount: 1,
    timestampMilliseconds: Date.now(),
    dataPoints: prices,
  }) as Kresko;

export type TestAssetIds = TestTokenSymbols;
export const redstoneMap = {
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
};

export const defaultRedstoneDataPoints: TestDataPackage[] = [
  { dataFeedId: 'DAI', value: 0 },
  { dataFeedId: 'USDC', value: 0 },
  { dataFeedId: 'ETH', value: 0 },
  { dataFeedId: 'BTC', value: 0 },
  { dataFeedId: 'KISS', value: 0 },
  { dataFeedId: 'TSLA', value: 0 },
  { dataFeedId: 'Coll8Dec', value: 0 },
  { dataFeedId: 'Coll18Dec', value: 0 },
  { dataFeedId: 'Coll21Dec', value: 0 },
  { dataFeedId: 'Collateral', value: 0 },
  { dataFeedId: 'Collateral2', value: 0 },
  { dataFeedId: 'Collateral3', value: 0 },
  { dataFeedId: 'Collateral4', value: 0 },
  { dataFeedId: 'KrAsset', value: 0 },
  { dataFeedId: 'KrAsset2', value: 0 },
  { dataFeedId: 'KrAsset3', value: 0 },
  { dataFeedId: 'KrAsset4', value: 0 },
  { dataFeedId: 'KrAsset5', value: 0 },
  { dataFeedId: 'IS_MARKET_KrAsset_OPEN', value: 1 },
  { dataFeedId: 'IS_MARKET_KrAsset2_OPEN', value: 1 },
  { dataFeedId: 'IS_MARKET_KrAsset3_OPEN', value: 1 },
  { dataFeedId: 'IS_MARKET_KrAsset4_OPEN', value: 1 },
  { dataFeedId: 'IS_MARKET_KrAsset5_OPEN', value: 1 },
];

export type TestMarketStatusSymbols =
  | 'IS_MARKET_KrAsset_OPEN'
  | 'IS_MARKET_KrAsset2_OPEN'
  | 'IS_MARKET_KrAsset3_OPEN'
  | 'IS_MARKET_KrAsset4_OPEN'
  | 'IS_MARKET_KrAsset5_OPEN';
export type TestDataPackage = { dataFeedId: AllUnderlyingIds; value: number };
export type AllUnderlyingIds =
  | TestAssetIds
  | 'ETH'
  | (typeof assets)[keyof typeof assets]['underlyingId']
  | TestMarketStatusSymbols;
