/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import type { BaseContract, BigNumber, BigNumberish, Signer, utils } from 'ethers';
import type { EventFragment } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from '../../../../../common';

export interface MEventInterface extends utils.Interface {
  functions: {};

  events: {
    'AMMOracleUpdated(address)': EventFragment;
    'BatchInterestLiquidationOccurred(address,address,address,uint256,uint256)': EventFragment;
    'CFactorUpdated(address,uint256)': EventFragment;
    'CollateralAssetAdded(string,address,uint256,address,uint256)': EventFragment;
    'CollateralAssetUpdated(string,address,uint256,address,uint256)': EventFragment;
    'CollateralDeposited(address,address,uint256)': EventFragment;
    'CollateralWithdrawn(address,address,uint256)': EventFragment;
    'DebtPositionClosed(address,address,uint256)': EventFragment;
    'FeePaid(address,address,uint256,uint256,uint256,uint256)': EventFragment;
    'FeeRecipientUpdated(address)': EventFragment;
    'InterestLiquidationOccurred(address,address,address,uint256,address,uint256)': EventFragment;
    'KFactorUpdated(address,uint256)': EventFragment;
    'KreskoAssetAdded(string,address,address,uint256,uint256,uint256,uint256)': EventFragment;
    'KreskoAssetBurned(address,address,uint256)': EventFragment;
    'KreskoAssetMinted(address,address,uint256)': EventFragment;
    'KreskoAssetUpdated(string,address,address,uint256,uint256,uint256,uint256)': EventFragment;
    'LiquidationIncentiveMultiplierUpdated(address,uint256)': EventFragment;
    'LiquidationOccurred(address,address,address,uint256,address,uint256)': EventFragment;
    'LiquidationThresholdUpdated(uint256)': EventFragment;
    'MaxLiquidationRatioUpdated(uint256)': EventFragment;
    'MinimumCollateralizationRatioUpdated(uint256)': EventFragment;
    'MinimumDebtValueUpdated(uint256)': EventFragment;
    'SafetyStateChange(uint8,address,string)': EventFragment;
    'UncheckedCollateralWithdrawn(address,address,uint256)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'AMMOracleUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'BatchInterestLiquidationOccurred'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'CFactorUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'CollateralAssetAdded'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'CollateralAssetUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'CollateralDeposited'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'CollateralWithdrawn'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'DebtPositionClosed'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'FeePaid'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'FeeRecipientUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'InterestLiquidationOccurred'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'KFactorUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'KreskoAssetAdded'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'KreskoAssetBurned'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'KreskoAssetMinted'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'KreskoAssetUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'LiquidationIncentiveMultiplierUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'LiquidationOccurred'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'LiquidationThresholdUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'MaxLiquidationRatioUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'MinimumCollateralizationRatioUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'MinimumDebtValueUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'SafetyStateChange'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'UncheckedCollateralWithdrawn'): EventFragment;
}

export interface AMMOracleUpdatedEventObject {
  ammOracle: string;
}
export type AMMOracleUpdatedEvent = TypedEvent<[string], AMMOracleUpdatedEventObject>;

export type AMMOracleUpdatedEventFilter = TypedEventFilter<AMMOracleUpdatedEvent>;

export interface BatchInterestLiquidationOccurredEventObject {
  account: string;
  liquidator: string;
  seizedCollateralAsset: string;
  repayUSD: BigNumber;
  collateralSent: BigNumber;
}
export type BatchInterestLiquidationOccurredEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber],
  BatchInterestLiquidationOccurredEventObject
>;

export type BatchInterestLiquidationOccurredEventFilter = TypedEventFilter<BatchInterestLiquidationOccurredEvent>;

export interface CFactorUpdatedEventObject {
  collateralAsset: string;
  cFactor: BigNumber;
}
export type CFactorUpdatedEvent = TypedEvent<[string, BigNumber], CFactorUpdatedEventObject>;

export type CFactorUpdatedEventFilter = TypedEventFilter<CFactorUpdatedEvent>;

export interface CollateralAssetAddedEventObject {
  id: string;
  collateralAsset: string;
  factor: BigNumber;
  anchor: string;
  liqIncentive: BigNumber;
}
export type CollateralAssetAddedEvent = TypedEvent<
  [string, string, BigNumber, string, BigNumber],
  CollateralAssetAddedEventObject
>;

export type CollateralAssetAddedEventFilter = TypedEventFilter<CollateralAssetAddedEvent>;

export interface CollateralAssetUpdatedEventObject {
  id: string;
  collateralAsset: string;
  factor: BigNumber;
  anchor: string;
  liqIncentive: BigNumber;
}
export type CollateralAssetUpdatedEvent = TypedEvent<
  [string, string, BigNumber, string, BigNumber],
  CollateralAssetUpdatedEventObject
>;

export type CollateralAssetUpdatedEventFilter = TypedEventFilter<CollateralAssetUpdatedEvent>;

export interface CollateralDepositedEventObject {
  account: string;
  collateralAsset: string;
  amount: BigNumber;
}
export type CollateralDepositedEvent = TypedEvent<[string, string, BigNumber], CollateralDepositedEventObject>;

export type CollateralDepositedEventFilter = TypedEventFilter<CollateralDepositedEvent>;

export interface CollateralWithdrawnEventObject {
  account: string;
  collateralAsset: string;
  amount: BigNumber;
}
export type CollateralWithdrawnEvent = TypedEvent<[string, string, BigNumber], CollateralWithdrawnEventObject>;

export type CollateralWithdrawnEventFilter = TypedEventFilter<CollateralWithdrawnEvent>;

export interface DebtPositionClosedEventObject {
  account: string;
  kreskoAsset: string;
  amount: BigNumber;
}
export type DebtPositionClosedEvent = TypedEvent<[string, string, BigNumber], DebtPositionClosedEventObject>;

export type DebtPositionClosedEventFilter = TypedEventFilter<DebtPositionClosedEvent>;

export interface FeePaidEventObject {
  account: string;
  paymentCollateralAsset: string;
  feeType: BigNumber;
  paymentAmount: BigNumber;
  paymentValue: BigNumber;
  feeValue: BigNumber;
}
export type FeePaidEvent = TypedEvent<[string, string, BigNumber, BigNumber, BigNumber, BigNumber], FeePaidEventObject>;

export type FeePaidEventFilter = TypedEventFilter<FeePaidEvent>;

export interface FeeRecipientUpdatedEventObject {
  feeRecipient: string;
}
export type FeeRecipientUpdatedEvent = TypedEvent<[string], FeeRecipientUpdatedEventObject>;

export type FeeRecipientUpdatedEventFilter = TypedEventFilter<FeeRecipientUpdatedEvent>;

export interface InterestLiquidationOccurredEventObject {
  account: string;
  liquidator: string;
  repayKreskoAsset: string;
  repayUSD: BigNumber;
  seizedCollateralAsset: string;
  collateralSent: BigNumber;
}
export type InterestLiquidationOccurredEvent = TypedEvent<
  [string, string, string, BigNumber, string, BigNumber],
  InterestLiquidationOccurredEventObject
>;

export type InterestLiquidationOccurredEventFilter = TypedEventFilter<InterestLiquidationOccurredEvent>;

export interface KFactorUpdatedEventObject {
  kreskoAsset: string;
  kFactor: BigNumber;
}
export type KFactorUpdatedEvent = TypedEvent<[string, BigNumber], KFactorUpdatedEventObject>;

export type KFactorUpdatedEventFilter = TypedEventFilter<KFactorUpdatedEvent>;

export interface KreskoAssetAddedEventObject {
  id: string;
  kreskoAsset: string;
  anchor: string;
  kFactor: BigNumber;
  supplyLimit: BigNumber;
  closeFee: BigNumber;
  openFee: BigNumber;
}
export type KreskoAssetAddedEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber, BigNumber, BigNumber],
  KreskoAssetAddedEventObject
>;

export type KreskoAssetAddedEventFilter = TypedEventFilter<KreskoAssetAddedEvent>;

export interface KreskoAssetBurnedEventObject {
  account: string;
  kreskoAsset: string;
  amount: BigNumber;
}
export type KreskoAssetBurnedEvent = TypedEvent<[string, string, BigNumber], KreskoAssetBurnedEventObject>;

export type KreskoAssetBurnedEventFilter = TypedEventFilter<KreskoAssetBurnedEvent>;

export interface KreskoAssetMintedEventObject {
  account: string;
  kreskoAsset: string;
  amount: BigNumber;
}
export type KreskoAssetMintedEvent = TypedEvent<[string, string, BigNumber], KreskoAssetMintedEventObject>;

export type KreskoAssetMintedEventFilter = TypedEventFilter<KreskoAssetMintedEvent>;

export interface KreskoAssetUpdatedEventObject {
  id: string;
  kreskoAsset: string;
  anchor: string;
  kFactor: BigNumber;
  supplyLimit: BigNumber;
  closeFee: BigNumber;
  openFee: BigNumber;
}
export type KreskoAssetUpdatedEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber, BigNumber, BigNumber],
  KreskoAssetUpdatedEventObject
>;

export type KreskoAssetUpdatedEventFilter = TypedEventFilter<KreskoAssetUpdatedEvent>;

export interface LiquidationIncentiveMultiplierUpdatedEventObject {
  asset: string;
  liqIncentiveMultiplier: BigNumber;
}
export type LiquidationIncentiveMultiplierUpdatedEvent = TypedEvent<
  [string, BigNumber],
  LiquidationIncentiveMultiplierUpdatedEventObject
>;

export type LiquidationIncentiveMultiplierUpdatedEventFilter =
  TypedEventFilter<LiquidationIncentiveMultiplierUpdatedEvent>;

export interface LiquidationOccurredEventObject {
  account: string;
  liquidator: string;
  repayKreskoAsset: string;
  repayAmount: BigNumber;
  seizedCollateralAsset: string;
  collateralSent: BigNumber;
}
export type LiquidationOccurredEvent = TypedEvent<
  [string, string, string, BigNumber, string, BigNumber],
  LiquidationOccurredEventObject
>;

export type LiquidationOccurredEventFilter = TypedEventFilter<LiquidationOccurredEvent>;

export interface LiquidationThresholdUpdatedEventObject {
  liquidationThreshold: BigNumber;
}
export type LiquidationThresholdUpdatedEvent = TypedEvent<[BigNumber], LiquidationThresholdUpdatedEventObject>;

export type LiquidationThresholdUpdatedEventFilter = TypedEventFilter<LiquidationThresholdUpdatedEvent>;

export interface MaxLiquidationRatioUpdatedEventObject {
  newMaxLiquidationRatio: BigNumber;
}
export type MaxLiquidationRatioUpdatedEvent = TypedEvent<[BigNumber], MaxLiquidationRatioUpdatedEventObject>;

export type MaxLiquidationRatioUpdatedEventFilter = TypedEventFilter<MaxLiquidationRatioUpdatedEvent>;

export interface MinimumCollateralizationRatioUpdatedEventObject {
  minCollateralRatio: BigNumber;
}
export type MinimumCollateralizationRatioUpdatedEvent = TypedEvent<
  [BigNumber],
  MinimumCollateralizationRatioUpdatedEventObject
>;

export type MinimumCollateralizationRatioUpdatedEventFilter =
  TypedEventFilter<MinimumCollateralizationRatioUpdatedEvent>;

export interface MinimumDebtValueUpdatedEventObject {
  minDebtValue: BigNumber;
}
export type MinimumDebtValueUpdatedEvent = TypedEvent<[BigNumber], MinimumDebtValueUpdatedEventObject>;

export type MinimumDebtValueUpdatedEventFilter = TypedEventFilter<MinimumDebtValueUpdatedEvent>;

export interface SafetyStateChangeEventObject {
  action: number;
  asset: string;
  description: string;
}
export type SafetyStateChangeEvent = TypedEvent<[number, string, string], SafetyStateChangeEventObject>;

export type SafetyStateChangeEventFilter = TypedEventFilter<SafetyStateChangeEvent>;

export interface UncheckedCollateralWithdrawnEventObject {
  account: string;
  collateralAsset: string;
  amount: BigNumber;
}
export type UncheckedCollateralWithdrawnEvent = TypedEvent<
  [string, string, BigNumber],
  UncheckedCollateralWithdrawnEventObject
>;

export type UncheckedCollateralWithdrawnEventFilter = TypedEventFilter<UncheckedCollateralWithdrawnEvent>;

export interface MEvent extends BaseContract {
  contractName: 'MEvent';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: MEventInterface;

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

  functions: {};

  callStatic: {};

  filters: {
    'AMMOracleUpdated(address)'(ammOracle?: PromiseOrValue<string> | null): AMMOracleUpdatedEventFilter;
    AMMOracleUpdated(ammOracle?: PromiseOrValue<string> | null): AMMOracleUpdatedEventFilter;

    'BatchInterestLiquidationOccurred(address,address,address,uint256,uint256)'(
      account?: PromiseOrValue<string> | null,
      liquidator?: PromiseOrValue<string> | null,
      seizedCollateralAsset?: PromiseOrValue<string> | null,
      repayUSD?: null,
      collateralSent?: null,
    ): BatchInterestLiquidationOccurredEventFilter;
    BatchInterestLiquidationOccurred(
      account?: PromiseOrValue<string> | null,
      liquidator?: PromiseOrValue<string> | null,
      seizedCollateralAsset?: PromiseOrValue<string> | null,
      repayUSD?: null,
      collateralSent?: null,
    ): BatchInterestLiquidationOccurredEventFilter;

    'CFactorUpdated(address,uint256)'(
      collateralAsset?: PromiseOrValue<string> | null,
      cFactor?: null,
    ): CFactorUpdatedEventFilter;
    CFactorUpdated(collateralAsset?: PromiseOrValue<string> | null, cFactor?: null): CFactorUpdatedEventFilter;

    'CollateralAssetAdded(string,address,uint256,address,uint256)'(
      id?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      factor?: null,
      anchor?: null,
      liqIncentive?: null,
    ): CollateralAssetAddedEventFilter;
    CollateralAssetAdded(
      id?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      factor?: null,
      anchor?: null,
      liqIncentive?: null,
    ): CollateralAssetAddedEventFilter;

    'CollateralAssetUpdated(string,address,uint256,address,uint256)'(
      id?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      factor?: null,
      anchor?: null,
      liqIncentive?: null,
    ): CollateralAssetUpdatedEventFilter;
    CollateralAssetUpdated(
      id?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      factor?: null,
      anchor?: null,
      liqIncentive?: null,
    ): CollateralAssetUpdatedEventFilter;

    'CollateralDeposited(address,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): CollateralDepositedEventFilter;
    CollateralDeposited(
      account?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): CollateralDepositedEventFilter;

    'CollateralWithdrawn(address,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): CollateralWithdrawnEventFilter;
    CollateralWithdrawn(
      account?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): CollateralWithdrawnEventFilter;

    'DebtPositionClosed(address,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): DebtPositionClosedEventFilter;
    DebtPositionClosed(
      account?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): DebtPositionClosedEventFilter;

    'FeePaid(address,address,uint256,uint256,uint256,uint256)'(
      account?: PromiseOrValue<string> | null,
      paymentCollateralAsset?: PromiseOrValue<string> | null,
      feeType?: PromiseOrValue<BigNumberish> | null,
      paymentAmount?: null,
      paymentValue?: null,
      feeValue?: null,
    ): FeePaidEventFilter;
    FeePaid(
      account?: PromiseOrValue<string> | null,
      paymentCollateralAsset?: PromiseOrValue<string> | null,
      feeType?: PromiseOrValue<BigNumberish> | null,
      paymentAmount?: null,
      paymentValue?: null,
      feeValue?: null,
    ): FeePaidEventFilter;

    'FeeRecipientUpdated(address)'(feeRecipient?: PromiseOrValue<string> | null): FeeRecipientUpdatedEventFilter;
    FeeRecipientUpdated(feeRecipient?: PromiseOrValue<string> | null): FeeRecipientUpdatedEventFilter;

    'InterestLiquidationOccurred(address,address,address,uint256,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      liquidator?: PromiseOrValue<string> | null,
      repayKreskoAsset?: PromiseOrValue<string> | null,
      repayUSD?: null,
      seizedCollateralAsset?: null,
      collateralSent?: null,
    ): InterestLiquidationOccurredEventFilter;
    InterestLiquidationOccurred(
      account?: PromiseOrValue<string> | null,
      liquidator?: PromiseOrValue<string> | null,
      repayKreskoAsset?: PromiseOrValue<string> | null,
      repayUSD?: null,
      seizedCollateralAsset?: null,
      collateralSent?: null,
    ): InterestLiquidationOccurredEventFilter;

    'KFactorUpdated(address,uint256)'(
      kreskoAsset?: PromiseOrValue<string> | null,
      kFactor?: null,
    ): KFactorUpdatedEventFilter;
    KFactorUpdated(kreskoAsset?: PromiseOrValue<string> | null, kFactor?: null): KFactorUpdatedEventFilter;

    'KreskoAssetAdded(string,address,address,uint256,uint256,uint256,uint256)'(
      id?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      anchor?: null,
      kFactor?: null,
      supplyLimit?: null,
      closeFee?: null,
      openFee?: null,
    ): KreskoAssetAddedEventFilter;
    KreskoAssetAdded(
      id?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      anchor?: null,
      kFactor?: null,
      supplyLimit?: null,
      closeFee?: null,
      openFee?: null,
    ): KreskoAssetAddedEventFilter;

    'KreskoAssetBurned(address,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): KreskoAssetBurnedEventFilter;
    KreskoAssetBurned(
      account?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): KreskoAssetBurnedEventFilter;

    'KreskoAssetMinted(address,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): KreskoAssetMintedEventFilter;
    KreskoAssetMinted(
      account?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): KreskoAssetMintedEventFilter;

    'KreskoAssetUpdated(string,address,address,uint256,uint256,uint256,uint256)'(
      id?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      anchor?: null,
      kFactor?: null,
      supplyLimit?: null,
      closeFee?: null,
      openFee?: null,
    ): KreskoAssetUpdatedEventFilter;
    KreskoAssetUpdated(
      id?: PromiseOrValue<string> | null,
      kreskoAsset?: PromiseOrValue<string> | null,
      anchor?: null,
      kFactor?: null,
      supplyLimit?: null,
      closeFee?: null,
      openFee?: null,
    ): KreskoAssetUpdatedEventFilter;

    'LiquidationIncentiveMultiplierUpdated(address,uint256)'(
      asset?: PromiseOrValue<string> | null,
      liqIncentiveMultiplier?: null,
    ): LiquidationIncentiveMultiplierUpdatedEventFilter;
    LiquidationIncentiveMultiplierUpdated(
      asset?: PromiseOrValue<string> | null,
      liqIncentiveMultiplier?: null,
    ): LiquidationIncentiveMultiplierUpdatedEventFilter;

    'LiquidationOccurred(address,address,address,uint256,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      liquidator?: PromiseOrValue<string> | null,
      repayKreskoAsset?: PromiseOrValue<string> | null,
      repayAmount?: null,
      seizedCollateralAsset?: null,
      collateralSent?: null,
    ): LiquidationOccurredEventFilter;
    LiquidationOccurred(
      account?: PromiseOrValue<string> | null,
      liquidator?: PromiseOrValue<string> | null,
      repayKreskoAsset?: PromiseOrValue<string> | null,
      repayAmount?: null,
      seizedCollateralAsset?: null,
      collateralSent?: null,
    ): LiquidationOccurredEventFilter;

    'LiquidationThresholdUpdated(uint256)'(liquidationThreshold?: null): LiquidationThresholdUpdatedEventFilter;
    LiquidationThresholdUpdated(liquidationThreshold?: null): LiquidationThresholdUpdatedEventFilter;

    'MaxLiquidationRatioUpdated(uint256)'(newMaxLiquidationRatio?: null): MaxLiquidationRatioUpdatedEventFilter;
    MaxLiquidationRatioUpdated(newMaxLiquidationRatio?: null): MaxLiquidationRatioUpdatedEventFilter;

    'MinimumCollateralizationRatioUpdated(uint256)'(
      minCollateralRatio?: null,
    ): MinimumCollateralizationRatioUpdatedEventFilter;
    MinimumCollateralizationRatioUpdated(minCollateralRatio?: null): MinimumCollateralizationRatioUpdatedEventFilter;

    'MinimumDebtValueUpdated(uint256)'(minDebtValue?: null): MinimumDebtValueUpdatedEventFilter;
    MinimumDebtValueUpdated(minDebtValue?: null): MinimumDebtValueUpdatedEventFilter;

    'SafetyStateChange(uint8,address,string)'(
      action?: PromiseOrValue<BigNumberish> | null,
      asset?: PromiseOrValue<string> | null,
      description?: PromiseOrValue<string> | null,
    ): SafetyStateChangeEventFilter;
    SafetyStateChange(
      action?: PromiseOrValue<BigNumberish> | null,
      asset?: PromiseOrValue<string> | null,
      description?: PromiseOrValue<string> | null,
    ): SafetyStateChangeEventFilter;

    'UncheckedCollateralWithdrawn(address,address,uint256)'(
      account?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): UncheckedCollateralWithdrawnEventFilter;
    UncheckedCollateralWithdrawn(
      account?: PromiseOrValue<string> | null,
      collateralAsset?: PromiseOrValue<string> | null,
      amount?: null,
    ): UncheckedCollateralWithdrawnEventFilter;
  };

  estimateGas: {};

  populateTransaction: {};
}
