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

export interface MintFacetInterface extends utils.Interface {
  functions: {
    'mintKreskoAsset(address,address,uint256)': FunctionFragment;
  };

  getFunction(nameOrSignatureOrTopic: 'mintKreskoAsset'): FunctionFragment;

  encodeFunctionData(
    functionFragment: 'mintKreskoAsset',
    values: [PromiseOrValue<string>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>],
  ): string;

  decodeFunctionResult(functionFragment: 'mintKreskoAsset', data: BytesLike): Result;

  events: {
    'FeePaid(address,address,uint256,uint256,uint256,uint256)': EventFragment;
    'KreskoAssetMinted(address,address,uint256)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'FeePaid'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'KreskoAssetMinted'): EventFragment;
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

export interface KreskoAssetMintedEventObject {
  account: string;
  kreskoAsset: string;
  amount: BigNumber;
}
export type KreskoAssetMintedEvent = TypedEvent<[string, string, BigNumber], KreskoAssetMintedEventObject>;

export type KreskoAssetMintedEventFilter = TypedEventFilter<KreskoAssetMintedEvent>;

export interface MintFacet extends BaseContract {
  contractName: 'MintFacet';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: MintFacetInterface;

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
    mintKreskoAsset(
      _account: PromiseOrValue<string>,
      _kreskoAsset: PromiseOrValue<string>,
      _mintAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;
  };

  mintKreskoAsset(
    _account: PromiseOrValue<string>,
    _kreskoAsset: PromiseOrValue<string>,
    _mintAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  callStatic: {
    mintKreskoAsset(
      _account: PromiseOrValue<string>,
      _kreskoAsset: PromiseOrValue<string>,
      _mintAmount: PromiseOrValue<BigNumberish>,
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
  };

  estimateGas: {
    mintKreskoAsset(
      _account: PromiseOrValue<string>,
      _kreskoAsset: PromiseOrValue<string>,
      _mintAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    mintKreskoAsset(
      _account: PromiseOrValue<string>,
      _kreskoAsset: PromiseOrValue<string>,
      _mintAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;
  };
}
