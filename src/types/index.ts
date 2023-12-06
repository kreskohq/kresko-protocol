import type { AllTokenSymbols } from '@config/hardhat/deploy';
import type { AssetConfigExtended } from '@config/hardhat/deploy/arbitrumGoerli';
import type { AllTickers } from '@utils/redstone';
import type { BigNumber, Overrides } from 'ethers';
import type { Address } from 'hardhat-deploy/types';
import type * as Contracts from './typechain';
import type {
  AssetStruct,
  CommonInitArgsStruct,
  FeedConfigurationStruct,
  MinterInitArgsStruct,
  SCDPInitArgsStruct,
} from './typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko';

export type ContractTypes = GetContractTypes<typeof Contracts>;
export type ContractNames = keyof ContractTypes;

export type NetworkConfig = {
  [network: string]: {
    commonInitAgs: Omit<CommonInitArgsStruct, 'feeRecipient' | 'admin' | 'council' | 'treasury'>;
    minterInitArgs: MinterInitArgsStruct;
    scdpInitArgs: SCDPInitArgsStruct;
    assets: AssetConfigExtended[];
    gnosisSafeDeployments?: GnosisSafeDeployment[];
  };
};

export enum OracleType {
  Empty,
  Redstone,
  Chainlink,
  API3,
  Vault,
}

export enum Action {
  DEPOSIT = 0,
  WITHDRAW = 1,
  REPAY = 2,
  BORROW = 3,
  LIQUIDATION = 4,
  SCDP_DEPOSIT = 5,
  SCDP_SWAP = 6,
  SCDP_WITHDRAW = 7,
  SCDP_REPAY = 8,
  SCDP_LIQUIDATION = 9,
}

export enum MinterFee {
  OPEN = 0,
  CLOSE = 1,
}

export type SCDPDepositAssetConfig = {
  depositLimitSCDP: BigNumberish;
};

type ExtendedInfo = {
  decimals: number;
  symbol: string;
};

export type AssetConfig = {
  args: AssetArgs;
  assetStruct: AssetStruct;
  feedConfig: FeedConfigurationStruct;
  extendedInfo: ExtendedInfo;
};
export type AssetArgs = {
  ticker: AllTickers;
  getPrice?: () => Promise<BigNumber>;
  getMarketStatus?: () => Promise<boolean>;
  symbol: AllTokenSymbols;
  name?: string;
  price?: number;
  marketOpen?: boolean;
  decimals?: number;
  feed?: string;
  oracleIds?: [OracleType, OracleType] | readonly [OracleType, OracleType];
  collateralConfig?: CollateralConfig;
  krAssetConfig?: KrAssetConfig;
  scdpKrAssetConfig?: SCDPKrAssetConfig;
  scdpDepositConfig?: SCDPDepositAssetConfig;
};

export type KrAssetConfig = {
  anchor: string | null;
  anchorSymbol?: string;
  underlyingAddr?: string;
  kFactor: BigNumberish;
  maxDebtMinter: BigNumberish;
  closeFee: BigNumberish;
  openFee: BigNumberish;
};

export type SCDPKrAssetConfig = {
  swapInFeeSCDP: BigNumberish;
  swapOutFeeSCDP: BigNumberish;
  liqIncentiveSCDP: BigNumberish;
  protocolFeeShareSCDP: BigNumberish;
  maxDebtSCDP: BigNumberish;
};

export type CollateralConfig = {
  cFactor: BigNumberish;
  liqIncentive: BigNumberish;
};
export type MinterInitializer = {
  name: 'MinterConfigurationFacet';
  args: MinterInitArgsStruct;
};
export type SCDPInitializer = {
  name: 'SCDPConfigFacet';
  args: SCDPInitArgsStruct;
};
export type CommonInitializer = {
  name: 'CommonConfigurationFacet';
  args: CommonInitArgsStruct;
};

export type GnosisSafeDeployment = {
  defaultAddress: Address;
  released: boolean;
  contractName: string;
  version: string;
  networkAddresses: {
    opgoerli: string;
  };
  abi: any;
};

/* -------------------------------------------------------------------------- */
/*                                 TYPE UTILS                                 */
/* -------------------------------------------------------------------------- */
export type FuncNames<T extends ContractNames> = keyof TC[T]['functions'] | undefined;

export type FuncArgs<F extends FuncNames<T>, T extends ContractNames> = F extends keyof TC[T]['functions']
  ? TC[T]['functions'][F] extends (...args: infer Args) => any
    ? Args extends readonly [...infer Args2, overrides?: Overrides | undefined]
      ? Args2 extends []
        ? never
        : readonly [...Args2]
      : never
    : never
  : never;
export type Or<T extends readonly unknown[]> = T extends readonly [infer Head, ...infer Tail]
  ? Head extends true
    ? true
    : Or<Tail>
  : false;
export type ValueOf<T> = T[keyof T];

export type IsUndefined<T> = [undefined] extends [T] ? true : false;
export type MaybeExcludeEmpty<T, TMaybeExclude extends boolean> = TMaybeExclude extends true
  ? Exclude<T, [] | null | undefined>
  : T;

export type MaybeRequired<T, TRequired extends boolean> = TRequired extends true ? Required<T> : T;
export type MaybeUndefined<T, TUndefinedish extends boolean> = TUndefinedish extends true ? T | undefined : T;
export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type ExcludeType<T, E> = {
  [K in keyof T]: T[K] extends E ? K : never;
}[keyof T];

export type Excludes =
  | 'AccessControlEnumerableUpgradeable'
  | 'AccessControlUpgradeable'
  | 'FallbackManager'
  | 'BaseGuard'
  | 'Guard'
  | 'GuardManager'
  | 'ModuleManager'
  | 'OwnerManager'
  | 'EtherPaymentFallback'
  | 'StorageAccessible';

type KeyValue<T = unknown> = {
  [key: string]: T;
};
export type FactoryName<T extends KeyValue> = Exclude<keyof T, 'factories'>;
export type MinEthersFactoryExt<C> = {
  connect(address: string, signerOrProvider: any): C;
};
export type InferContractType<Factory> = Factory extends MinEthersFactoryExt<infer C> ? C : unknown;

export type GetContractTypes<T extends KeyValue> = {
  [K in FactoryName<T> as `${Split<K extends string ? K : never, '__factory'>[0]}`]: InferContractType<T[K]>;
};
