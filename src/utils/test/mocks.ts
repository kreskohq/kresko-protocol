import { MaxUint128, toBig } from '@utils/values';
import { AssetArgs, OracleType } from 'types';

export type InputArgs = {
  user: SignerWithAddress;
  asset: TestAsset<any, any>;
  amount: BigNumber;
};

export type InputArgsSimple = Omit<InputArgs, 'asset'> & {
  asset: { address: string };
};

export const TEN_USD = 10;
export const ONE_USD = 1;
export const defaultOracleDecimals = 8;

export const defaultDecimals = 18;

export const defaultDepositAmount = toBig(10, defaultDecimals);
export const defaultMintAmount = toBig(100, defaultDecimals);

export const defaultSupplyLimit = MaxUint128;
export const defaultCloseFee = 0.02e4; // 2%
export const defaultOpenFee = 0; // 0%

export const testKrAssetConfig: AssetArgs = {
  underlyingId: 'KrAsset',
  name: 'KrAsset',
  symbol: 'KrAsset',
  marketOpen: true,
  price: TEN_USD,
  krAssetConfig: {
    anchorSymbol: 'aKrAsset',
    closeFee: defaultCloseFee,
    openFee: defaultOpenFee,
    kFactor: 1e4,
    supplyLimit: defaultSupplyLimit,
    anchor: null,
  },
  oracleIds: [OracleType.Redstone, OracleType.Chainlink] as [OracleType, OracleType],
};

export const testCollateralConfig: AssetArgs = {
  underlyingId: 'Collateral',
  name: 'Collateral',
  symbol: 'Collateral',
  price: TEN_USD,
  marketOpen: true,
  collateralConfig: {
    cFactor: 1e4,
    liqIncentive: 1.1e4,
  },
  decimals: defaultDecimals,
  oracleIds: [OracleType.Redstone, OracleType.Chainlink] as [OracleType, OracleType],
};
export const testCommonParams = (feeRecipient: string) => ({
  minDebtValue: toBig(20, 8),
  feeRecipient: feeRecipient,
  oracleDeviationPct: 0.02e4,
  phase: 3,
  kreskian: hre.ethers.constants.AddressZero,
  questForKresk: hre.ethers.constants.AddressZero,
});
export const testMinterParams = (feeRecipient: string) => ({
  minCollateralRatio: 1.8e4,
  liquidationThreshold: 1.3e4,
  MLR: 1.32e4,
});

export default {
  supplyLimit: defaultSupplyLimit,
  closeFee: defaultCloseFee,
  openFee: defaultOpenFee,
  mintAmount: defaultMintAmount,
  depositAmount: defaultDepositAmount,
  testCollateralConfig,
  testKrAssetConfig,
  oracle: {
    price: TEN_USD,
    decimals: defaultOracleDecimals,
  },
  testCommonParams,
  testMinterParams,
};
