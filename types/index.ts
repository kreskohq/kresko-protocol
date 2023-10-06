import { AssetConfigExtended } from "@deploy-config/arbitrumGoerli";
import { AllTokenSymbols } from "@deploy-config/shared";
import { AllUnderlyingIds } from "@utils/redstone";
import { BigNumber } from "ethers";
import { Address } from "hardhat-deploy/types";
import type * as Contracts from "./typechain";
import {
  AssetStruct,
  CommonInitArgsStruct,
  FeedConfigurationStruct,
  MinterInitArgsStruct,
  SCDPInitArgsStruct,
} from "./typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ""
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];
export type Split2<S extends string, D extends string> = string extends S
  ? string[]
  : S extends never
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [...Split<U, D>]
  : [S];

export type ExcludeType<T, E> = {
  [K in keyof T]: T[K] extends E ? K : never;
}[keyof T];

export type Excludes =
  | "AccessControlEnumerableUpgradeable"
  | "AccessControlUpgradeable"
  | "FallbackManager"
  | "BaseGuard"
  | "Guard"
  | "GuardManager"
  | "ModuleManager"
  | "OwnerManager"
  | "EtherPaymentFallback"
  | "StorageAccessible";
type KeyValue<T = unknown> = {
  [key: string]: T;
};
export type FactoryName<T extends KeyValue> = Exclude<keyof T, "factories">;
export type MinEthersFactoryExt<C> = {
  connect(address: string, signerOrProvider: any): C;
};
export type InferContractType<Factory> = Factory extends MinEthersFactoryExt<infer C> ? C : unknown;

export type GetContractTypes<T extends KeyValue> = {
  [K in FactoryName<T> as `${Split<K extends string ? K : never, "__factory">[0]}`]: InferContractType<T[K]>;
};

export type ContractTypes = GetContractTypes<typeof Contracts>;
export type ContractNames = keyof ContractTypes;

export type NetworkConfig = {
  [network: string]: {
    commonInitAgs: Omit<CommonInitArgsStruct, "feeRecipient" | "admin" | "council" | "treasury">;
    minterInitArgs: MinterInitArgsStruct;
    scdpInitArgs: SCDPInitArgsStruct;
    assets: AssetConfigExtended[];
    gnosisSafeDeployments?: GnosisSafeDeployment[];
  };
};

export enum OracleType {
  Redstone,
  Chainlink,
  API3,
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
  underlyingId: AllUnderlyingIds;
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
  kFactor: BigNumberish;
  supplyLimit: BigNumberish;
  closeFee: BigNumberish;
  openFee: BigNumberish;
};

export type SCDPKrAssetConfig = {
  swapInFeeSCDP: BigNumberish;
  swapOutFeeSCDP: BigNumberish;
  liqIncentiveSCDP: BigNumberish;
  protocolFeeShareSCDP: BigNumberish;
};

export type CollateralConfig = {
  cFactor: BigNumberish;
  liqIncentive: BigNumberish;
};
export type MinterInitializer = {
  name: "ConfigurationFacet";
  args: MinterInitArgsStruct;
};
export type SCDPInitializer = {
  name: "SCDPConfigFacet";
  args: SCDPInitArgsStruct;
};
export type CommonInitializer = {
  name: "CommonConfigurationFacet";
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
