/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from 'ethers';
import type { FunctionFragment, Result } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from '../../../../../common';

export type UserAssetDataStruct = {
  asset: PromiseOrValue<string>;
  assetPrice: PromiseOrValue<BigNumberish>;
  depositAmount: PromiseOrValue<BigNumberish>;
  scaledDepositAmount: PromiseOrValue<BigNumberish>;
  depositValue: PromiseOrValue<BigNumberish>;
  scaledDepositValue: PromiseOrValue<BigNumberish>;
};

export type UserAssetDataStructOutput = [string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
  asset: string;
  assetPrice: BigNumber;
  depositAmount: BigNumber;
  scaledDepositAmount: BigNumber;
  depositValue: BigNumber;
  scaledDepositValue: BigNumber;
};

export type UserDataStruct = {
  account: PromiseOrValue<string>;
  totalDepositValue: PromiseOrValue<BigNumberish>;
  totalScaledDepositValue: PromiseOrValue<BigNumberish>;
  totalFeesValue: PromiseOrValue<BigNumberish>;
  deposits: UserAssetDataStruct[];
};

export type UserDataStructOutput = [string, BigNumber, BigNumber, BigNumber, UserAssetDataStructOutput[]] & {
  account: string;
  totalDepositValue: BigNumber;
  totalScaledDepositValue: BigNumber;
  totalFeesValue: BigNumber;
  deposits: UserAssetDataStructOutput[];
};

export type AssetStruct = {
  underlyingId: PromiseOrValue<BytesLike>;
  anchor: PromiseOrValue<string>;
  oracles: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
  factor: PromiseOrValue<BigNumberish>;
  kFactor: PromiseOrValue<BigNumberish>;
  openFee: PromiseOrValue<BigNumberish>;
  closeFee: PromiseOrValue<BigNumberish>;
  liqIncentive: PromiseOrValue<BigNumberish>;
  supplyLimit: PromiseOrValue<BigNumberish>;
  depositLimitSCDP: PromiseOrValue<BigNumberish>;
  liquidityIndexSCDP: PromiseOrValue<BigNumberish>;
  swapInFeeSCDP: PromiseOrValue<BigNumberish>;
  swapOutFeeSCDP: PromiseOrValue<BigNumberish>;
  protocolFeeShareSCDP: PromiseOrValue<BigNumberish>;
  liqIncentiveSCDP: PromiseOrValue<BigNumberish>;
  decimals: PromiseOrValue<BigNumberish>;
  isCollateral: PromiseOrValue<boolean>;
  isKrAsset: PromiseOrValue<boolean>;
  isSCDPDepositAsset: PromiseOrValue<boolean>;
  isSCDPKrAsset: PromiseOrValue<boolean>;
  isSCDPCollateral: PromiseOrValue<boolean>;
  isSCDPCoverAsset: PromiseOrValue<boolean>;
};

export type AssetStructOutput = [
  string,
  string,
  [number, number],
  number,
  number,
  number,
  number,
  number,
  BigNumber,
  BigNumber,
  BigNumber,
  number,
  number,
  number,
  number,
  number,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
] & {
  underlyingId: string;
  anchor: string;
  oracles: [number, number];
  factor: number;
  kFactor: number;
  openFee: number;
  closeFee: number;
  liqIncentive: number;
  supplyLimit: BigNumber;
  depositLimitSCDP: BigNumber;
  liquidityIndexSCDP: BigNumber;
  swapInFeeSCDP: number;
  swapOutFeeSCDP: number;
  protocolFeeShareSCDP: number;
  liqIncentiveSCDP: number;
  decimals: number;
  isCollateral: boolean;
  isKrAsset: boolean;
  isSCDPDepositAsset: boolean;
  isSCDPKrAsset: boolean;
  isSCDPCollateral: boolean;
  isSCDPCoverAsset: boolean;
};

export type AssetDataStruct = {
  addr: PromiseOrValue<string>;
  depositAmount: PromiseOrValue<BigNumberish>;
  depositValue: PromiseOrValue<BigNumberish>;
  depositValueAdjusted: PromiseOrValue<BigNumberish>;
  debtAmount: PromiseOrValue<BigNumberish>;
  debtValue: PromiseOrValue<BigNumberish>;
  debtValueAdjusted: PromiseOrValue<BigNumberish>;
  swapDeposits: PromiseOrValue<BigNumberish>;
  asset: AssetStruct;
  assetPrice: PromiseOrValue<BigNumberish>;
  symbol: PromiseOrValue<string>;
};

export type AssetDataStructOutput = [
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  AssetStructOutput,
  BigNumber,
  string,
] & {
  addr: string;
  depositAmount: BigNumber;
  depositValue: BigNumber;
  depositValueAdjusted: BigNumber;
  debtAmount: BigNumber;
  debtValue: BigNumber;
  debtValueAdjusted: BigNumber;
  swapDeposits: BigNumber;
  asset: AssetStructOutput;
  assetPrice: BigNumber;
  symbol: string;
};

export type GlobalDataStruct = {
  collateralValue: PromiseOrValue<BigNumberish>;
  collateralValueAdjusted: PromiseOrValue<BigNumberish>;
  debtValue: PromiseOrValue<BigNumberish>;
  debtValueAdjusted: PromiseOrValue<BigNumberish>;
  effectiveDebtValue: PromiseOrValue<BigNumberish>;
  cr: PromiseOrValue<BigNumberish>;
  crDebtValue: PromiseOrValue<BigNumberish>;
  crDebtValueAdjusted: PromiseOrValue<BigNumberish>;
};

export type GlobalDataStructOutput = [
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
] & {
  collateralValue: BigNumber;
  collateralValueAdjusted: BigNumber;
  debtValue: BigNumber;
  debtValueAdjusted: BigNumber;
  effectiveDebtValue: BigNumber;
  cr: BigNumber;
  crDebtValue: BigNumber;
  crDebtValueAdjusted: BigNumber;
};

export interface SCDPStateFacetInterface extends utils.Interface {
  functions: {
    'getAccountDepositFeesGainedSCDP(address,address)': FunctionFragment;
    'getAccountDepositSCDP(address,address)': FunctionFragment;
    'getAccountDepositValueSCDP(address,address)': FunctionFragment;
    'getAccountInfoSCDP(address,address[])': FunctionFragment;
    'getAccountInfosSCDP(address[],address[])': FunctionFragment;
    'getAccountScaledDepositValueCDP(address,address)': FunctionFragment;
    'getAccountScaledDepositsSCDP(address,address)': FunctionFragment;
    'getAccountTotalDepositsValueSCDP(address)': FunctionFragment;
    'getAccountTotalScaledDepositsValueSCDP(address)': FunctionFragment;
    'getAssetEnabledSCDP(address)': FunctionFragment;
    'getAssetInfoSCDP(address)': FunctionFragment;
    'getAssetInfosSCDP(address[])': FunctionFragment;
    'getCollateralRatioSCDP()': FunctionFragment;
    'getCollateralValueSCDP(address,bool)': FunctionFragment;
    'getCollateralsSCDP()': FunctionFragment;
    'getDebtSCDP(address)': FunctionFragment;
    'getDebtValueSCDP(address,bool)': FunctionFragment;
    'getDepositAssetsSCDP()': FunctionFragment;
    'getDepositEnabledSCDP(address)': FunctionFragment;
    'getDepositsSCDP(address)': FunctionFragment;
    'getFeeRecipientSCDP()': FunctionFragment;
    'getKreskoAssetsSCDP()': FunctionFragment;
    'getStatisticsSCDP()': FunctionFragment;
    'getSwapDepositsSCDP(address)': FunctionFragment;
    'getSwapEnabledSCDP(address,address)': FunctionFragment;
    'getTotalCollateralValueSCDP(bool)': FunctionFragment;
    'getTotalDebtValueSCDP(bool)': FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | 'getAccountDepositFeesGainedSCDP'
      | 'getAccountDepositSCDP'
      | 'getAccountDepositValueSCDP'
      | 'getAccountInfoSCDP'
      | 'getAccountInfosSCDP'
      | 'getAccountScaledDepositValueCDP'
      | 'getAccountScaledDepositsSCDP'
      | 'getAccountTotalDepositsValueSCDP'
      | 'getAccountTotalScaledDepositsValueSCDP'
      | 'getAssetEnabledSCDP'
      | 'getAssetInfoSCDP'
      | 'getAssetInfosSCDP'
      | 'getCollateralRatioSCDP'
      | 'getCollateralValueSCDP'
      | 'getCollateralsSCDP'
      | 'getDebtSCDP'
      | 'getDebtValueSCDP'
      | 'getDepositAssetsSCDP'
      | 'getDepositEnabledSCDP'
      | 'getDepositsSCDP'
      | 'getFeeRecipientSCDP'
      | 'getKreskoAssetsSCDP'
      | 'getStatisticsSCDP'
      | 'getSwapDepositsSCDP'
      | 'getSwapEnabledSCDP'
      | 'getTotalCollateralValueSCDP'
      | 'getTotalDebtValueSCDP',
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: 'getAccountDepositFeesGainedSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(
    functionFragment: 'getAccountDepositSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(
    functionFragment: 'getAccountDepositValueSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(
    functionFragment: 'getAccountInfoSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>[]],
  ): string;
  encodeFunctionData(
    functionFragment: 'getAccountInfosSCDP',
    values: [PromiseOrValue<string>[], PromiseOrValue<string>[]],
  ): string;
  encodeFunctionData(
    functionFragment: 'getAccountScaledDepositValueCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(
    functionFragment: 'getAccountScaledDepositsSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(functionFragment: 'getAccountTotalDepositsValueSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(
    functionFragment: 'getAccountTotalScaledDepositsValueSCDP',
    values: [PromiseOrValue<string>],
  ): string;
  encodeFunctionData(functionFragment: 'getAssetEnabledSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(functionFragment: 'getAssetInfoSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(functionFragment: 'getAssetInfosSCDP', values: [PromiseOrValue<string>[]]): string;
  encodeFunctionData(functionFragment: 'getCollateralRatioSCDP', values?: undefined): string;
  encodeFunctionData(
    functionFragment: 'getCollateralValueSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<boolean>],
  ): string;
  encodeFunctionData(functionFragment: 'getCollateralsSCDP', values?: undefined): string;
  encodeFunctionData(functionFragment: 'getDebtSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(
    functionFragment: 'getDebtValueSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<boolean>],
  ): string;
  encodeFunctionData(functionFragment: 'getDepositAssetsSCDP', values?: undefined): string;
  encodeFunctionData(functionFragment: 'getDepositEnabledSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(functionFragment: 'getDepositsSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(functionFragment: 'getFeeRecipientSCDP', values?: undefined): string;
  encodeFunctionData(functionFragment: 'getKreskoAssetsSCDP', values?: undefined): string;
  encodeFunctionData(functionFragment: 'getStatisticsSCDP', values?: undefined): string;
  encodeFunctionData(functionFragment: 'getSwapDepositsSCDP', values: [PromiseOrValue<string>]): string;
  encodeFunctionData(
    functionFragment: 'getSwapEnabledSCDP',
    values: [PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(functionFragment: 'getTotalCollateralValueSCDP', values: [PromiseOrValue<boolean>]): string;
  encodeFunctionData(functionFragment: 'getTotalDebtValueSCDP', values: [PromiseOrValue<boolean>]): string;

  decodeFunctionResult(functionFragment: 'getAccountDepositFeesGainedSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountDepositSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountDepositValueSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountInfoSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountInfosSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountScaledDepositValueCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountScaledDepositsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountTotalDepositsValueSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAccountTotalScaledDepositsValueSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAssetEnabledSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAssetInfoSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getAssetInfosSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getCollateralRatioSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getCollateralValueSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getCollateralsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getDebtSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getDebtValueSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getDepositAssetsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getDepositEnabledSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getDepositsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getFeeRecipientSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getKreskoAssetsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getStatisticsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getSwapDepositsSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getSwapEnabledSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getTotalCollateralValueSCDP', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getTotalDebtValueSCDP', data: BytesLike): Result;

  events: {};
}

export interface SCDPStateFacet extends BaseContract {
  contractName: 'SCDPStateFacet';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: SCDPStateFacetInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    getAccountDepositFeesGainedSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getAccountDepositSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getAccountDepositValueSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getAccountInfoSCDP(
      _account: PromiseOrValue<string>,
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<[UserDataStructOutput] & { result: UserDataStructOutput }>;

    getAccountInfosSCDP(
      _accounts: PromiseOrValue<string>[],
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<[UserDataStructOutput[]] & { result: UserDataStructOutput[] }>;

    getAccountScaledDepositValueCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getAccountScaledDepositsSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getAccountTotalDepositsValueSCDP(_account: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;

    getAccountTotalScaledDepositsValueSCDP(
      _account: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getAssetEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

    getAssetInfoSCDP(
      _asset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[AssetDataStructOutput] & { results: AssetDataStructOutput }>;

    getAssetInfosSCDP(
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<[AssetDataStructOutput[]] & { results: AssetDataStructOutput[] }>;

    getCollateralRatioSCDP(overrides?: CallOverrides): Promise<[BigNumber]>;

    getCollateralValueSCDP(
      _depositAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getCollateralsSCDP(overrides?: CallOverrides): Promise<[string[]] & { result: string[] }>;

    getDebtSCDP(_kreskoAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;

    getDebtValueSCDP(
      _kreskoAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getDepositAssetsSCDP(overrides?: CallOverrides): Promise<[string[]] & { result: string[] }>;

    getDepositEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

    getDepositsSCDP(_depositAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;

    getFeeRecipientSCDP(overrides?: CallOverrides): Promise<[string]>;

    getKreskoAssetsSCDP(overrides?: CallOverrides): Promise<[string[]]>;

    getStatisticsSCDP(overrides?: CallOverrides): Promise<[GlobalDataStructOutput]>;

    getSwapDepositsSCDP(_collateralAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;

    getSwapEnabledSCDP(
      _assetIn: PromiseOrValue<string>,
      _assetOut: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[boolean]>;

    getTotalCollateralValueSCDP(
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<[BigNumber]>;

    getTotalDebtValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<[BigNumber]>;
  };

  getAccountDepositFeesGainedSCDP(
    _account: PromiseOrValue<string>,
    _depositAsset: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getAccountDepositSCDP(
    _account: PromiseOrValue<string>,
    _depositAsset: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getAccountDepositValueSCDP(
    _account: PromiseOrValue<string>,
    _depositAsset: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getAccountInfoSCDP(
    _account: PromiseOrValue<string>,
    _assets: PromiseOrValue<string>[],
    overrides?: CallOverrides,
  ): Promise<UserDataStructOutput>;

  getAccountInfosSCDP(
    _accounts: PromiseOrValue<string>[],
    _assets: PromiseOrValue<string>[],
    overrides?: CallOverrides,
  ): Promise<UserDataStructOutput[]>;

  getAccountScaledDepositValueCDP(
    _account: PromiseOrValue<string>,
    _depositAsset: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getAccountScaledDepositsSCDP(
    _account: PromiseOrValue<string>,
    _depositAsset: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getAccountTotalDepositsValueSCDP(_account: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

  getAccountTotalScaledDepositsValueSCDP(
    _account: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getAssetEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

  getAssetInfoSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<AssetDataStructOutput>;

  getAssetInfosSCDP(_assets: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<AssetDataStructOutput[]>;

  getCollateralRatioSCDP(overrides?: CallOverrides): Promise<BigNumber>;

  getCollateralValueSCDP(
    _depositAsset: PromiseOrValue<string>,
    _ignoreFactors: PromiseOrValue<boolean>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getCollateralsSCDP(overrides?: CallOverrides): Promise<string[]>;

  getDebtSCDP(_kreskoAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

  getDebtValueSCDP(
    _kreskoAsset: PromiseOrValue<string>,
    _ignoreFactors: PromiseOrValue<boolean>,
    overrides?: CallOverrides,
  ): Promise<BigNumber>;

  getDepositAssetsSCDP(overrides?: CallOverrides): Promise<string[]>;

  getDepositEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

  getDepositsSCDP(_depositAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

  getFeeRecipientSCDP(overrides?: CallOverrides): Promise<string>;

  getKreskoAssetsSCDP(overrides?: CallOverrides): Promise<string[]>;

  getStatisticsSCDP(overrides?: CallOverrides): Promise<GlobalDataStructOutput>;

  getSwapDepositsSCDP(_collateralAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

  getSwapEnabledSCDP(
    _assetIn: PromiseOrValue<string>,
    _assetOut: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<boolean>;

  getTotalCollateralValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<BigNumber>;

  getTotalDebtValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<BigNumber>;

  callStatic: {
    getAccountDepositFeesGainedSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountDepositSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountDepositValueSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountInfoSCDP(
      _account: PromiseOrValue<string>,
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<UserDataStructOutput>;

    getAccountInfosSCDP(
      _accounts: PromiseOrValue<string>[],
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<UserDataStructOutput[]>;

    getAccountScaledDepositValueCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountScaledDepositsSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountTotalDepositsValueSCDP(_account: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getAccountTotalScaledDepositsValueSCDP(
      _account: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAssetEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    getAssetInfoSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<AssetDataStructOutput>;

    getAssetInfosSCDP(_assets: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<AssetDataStructOutput[]>;

    getCollateralRatioSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getCollateralValueSCDP(
      _depositAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getCollateralsSCDP(overrides?: CallOverrides): Promise<string[]>;

    getDebtSCDP(_kreskoAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getDebtValueSCDP(
      _kreskoAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getDepositAssetsSCDP(overrides?: CallOverrides): Promise<string[]>;

    getDepositEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    getDepositsSCDP(_depositAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getFeeRecipientSCDP(overrides?: CallOverrides): Promise<string>;

    getKreskoAssetsSCDP(overrides?: CallOverrides): Promise<string[]>;

    getStatisticsSCDP(overrides?: CallOverrides): Promise<GlobalDataStructOutput>;

    getSwapDepositsSCDP(_collateralAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getSwapEnabledSCDP(
      _assetIn: PromiseOrValue<string>,
      _assetOut: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<boolean>;

    getTotalCollateralValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<BigNumber>;

    getTotalDebtValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<BigNumber>;
  };

  filters: {};

  estimateGas: {
    getAccountDepositFeesGainedSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountDepositSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountDepositValueSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountInfoSCDP(
      _account: PromiseOrValue<string>,
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountInfosSCDP(
      _accounts: PromiseOrValue<string>[],
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountScaledDepositValueCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountScaledDepositsSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAccountTotalDepositsValueSCDP(_account: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getAccountTotalScaledDepositsValueSCDP(
      _account: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getAssetEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getAssetInfoSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getAssetInfosSCDP(_assets: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<BigNumber>;

    getCollateralRatioSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getCollateralValueSCDP(
      _depositAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getCollateralsSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getDebtSCDP(_kreskoAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getDebtValueSCDP(
      _kreskoAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getDepositAssetsSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getDepositEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getDepositsSCDP(_depositAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getFeeRecipientSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getKreskoAssetsSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getStatisticsSCDP(overrides?: CallOverrides): Promise<BigNumber>;

    getSwapDepositsSCDP(_collateralAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

    getSwapEnabledSCDP(
      _assetIn: PromiseOrValue<string>,
      _assetOut: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    getTotalCollateralValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<BigNumber>;

    getTotalDebtValueSCDP(_ignoreFactors: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    getAccountDepositFeesGainedSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountDepositSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountDepositValueSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountInfoSCDP(
      _account: PromiseOrValue<string>,
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountInfosSCDP(
      _accounts: PromiseOrValue<string>[],
      _assets: PromiseOrValue<string>[],
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountScaledDepositValueCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountScaledDepositsSCDP(
      _account: PromiseOrValue<string>,
      _depositAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountTotalDepositsValueSCDP(
      _account: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAccountTotalScaledDepositsValueSCDP(
      _account: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getAssetEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getAssetInfoSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getAssetInfosSCDP(_assets: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getCollateralRatioSCDP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getCollateralValueSCDP(
      _depositAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getCollateralsSCDP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getDebtSCDP(_kreskoAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getDebtValueSCDP(
      _kreskoAsset: PromiseOrValue<string>,
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getDepositAssetsSCDP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getDepositEnabledSCDP(_asset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getDepositsSCDP(_depositAsset: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getFeeRecipientSCDP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getKreskoAssetsSCDP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getStatisticsSCDP(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getSwapDepositsSCDP(
      _collateralAsset: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getSwapEnabledSCDP(
      _assetIn: PromiseOrValue<string>,
      _assetOut: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getTotalCollateralValueSCDP(
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    getTotalDebtValueSCDP(
      _ignoreFactors: PromiseOrValue<boolean>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;
  };
}
