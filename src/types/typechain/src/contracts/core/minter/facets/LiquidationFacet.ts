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
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from 'ethers';
import type { FunctionFragment, Result, EventFragment } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from '../../../../../common';

export type MaxLiqInfoStruct = {
  account: PromiseOrValue<string>;
  seizeAssetAddr: PromiseOrValue<string>;
  repayAssetAddr: PromiseOrValue<string>;
  repayValue: PromiseOrValue<BigNumberish>;
  repayAmount: PromiseOrValue<BigNumberish>;
  seizeAmount: PromiseOrValue<BigNumberish>;
  seizeValue: PromiseOrValue<BigNumberish>;
  repayAssetPrice: PromiseOrValue<BigNumberish>;
  repayAssetIndex: PromiseOrValue<BigNumberish>;
  seizeAssetPrice: PromiseOrValue<BigNumberish>;
  seizeAssetIndex: PromiseOrValue<BigNumberish>;
};

export type MaxLiqInfoStructOutput = [
  string,
  string,
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
] & {
  account: string;
  seizeAssetAddr: string;
  repayAssetAddr: string;
  repayValue: BigNumber;
  repayAmount: BigNumber;
  seizeAmount: BigNumber;
  seizeValue: BigNumber;
  repayAssetPrice: BigNumber;
  repayAssetIndex: BigNumber;
  seizeAssetPrice: BigNumber;
  seizeAssetIndex: BigNumber;
};

export interface LiquidationFacetInterface extends utils.Interface {
  functions: {
    'getMaxLiqValue(address,address,address)': FunctionFragment;
    'liquidate(address,address,uint256,address,uint256,uint256)': FunctionFragment;
  };

  getFunction(nameOrSignatureOrTopic: 'getMaxLiqValue' | 'liquidate'): FunctionFragment;

  encodeFunctionData(
    functionFragment: 'getMaxLiqValue',
    values: [PromiseOrValue<string>, PromiseOrValue<string>, PromiseOrValue<string>],
  ): string;
  encodeFunctionData(
    functionFragment: 'liquidate',
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
    ],
  ): string;

  decodeFunctionResult(functionFragment: 'getMaxLiqValue', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'liquidate', data: BytesLike): Result;

  events: {
    'FeePaid(address,address,uint256,uint256,uint256,uint256)': EventFragment;
    'LiquidationOccurred(address,address,address,uint256,address,uint256)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'FeePaid'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'LiquidationOccurred'): EventFragment;
}

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

export interface LiquidationFacet extends BaseContract {
  contractName: 'LiquidationFacet';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: LiquidationFacetInterface;

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
    getMaxLiqValue(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _seizeAssetAddr: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<[MaxLiqInfoStructOutput]>;

    liquidate(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _repayAmount: PromiseOrValue<BigNumberish>,
      _seizeAssetAddr: PromiseOrValue<string>,
      _repayAssetIndex: PromiseOrValue<BigNumberish>,
      _seizeAssetIndex: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;
  };

  getMaxLiqValue(
    _account: PromiseOrValue<string>,
    _repayAssetAddr: PromiseOrValue<string>,
    _seizeAssetAddr: PromiseOrValue<string>,
    overrides?: CallOverrides,
  ): Promise<MaxLiqInfoStructOutput>;

  liquidate(
    _account: PromiseOrValue<string>,
    _repayAssetAddr: PromiseOrValue<string>,
    _repayAmount: PromiseOrValue<BigNumberish>,
    _seizeAssetAddr: PromiseOrValue<string>,
    _repayAssetIndex: PromiseOrValue<BigNumberish>,
    _seizeAssetIndex: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  callStatic: {
    getMaxLiqValue(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _seizeAssetAddr: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<MaxLiqInfoStructOutput>;

    liquidate(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _repayAmount: PromiseOrValue<BigNumberish>,
      _seizeAssetAddr: PromiseOrValue<string>,
      _repayAssetIndex: PromiseOrValue<BigNumberish>,
      _seizeAssetIndex: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<void>;
  };

  filters: {
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
  };

  estimateGas: {
    getMaxLiqValue(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _seizeAssetAddr: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<BigNumber>;

    liquidate(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _repayAmount: PromiseOrValue<BigNumberish>,
      _seizeAssetAddr: PromiseOrValue<string>,
      _repayAssetIndex: PromiseOrValue<BigNumberish>,
      _seizeAssetIndex: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getMaxLiqValue(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _seizeAssetAddr: PromiseOrValue<string>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    liquidate(
      _account: PromiseOrValue<string>,
      _repayAssetAddr: PromiseOrValue<string>,
      _repayAmount: PromiseOrValue<BigNumberish>,
      _seizeAssetAddr: PromiseOrValue<string>,
      _repayAssetIndex: PromiseOrValue<BigNumberish>,
      _seizeAssetIndex: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;
  };
}
