/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import type { BaseContract, BigNumber, BigNumberish, BytesLike, Signer, utils } from 'ethers';
import type { EventFragment } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from '../../../../common';

export type FacetCutStruct = {
  facetAddress: PromiseOrValue<string>;
  action: PromiseOrValue<BigNumberish>;
  functionSelectors: PromiseOrValue<BytesLike>[];
};

export type FacetCutStructOutput = [string, number, string[]] & {
  facetAddress: string;
  action: number;
  functionSelectors: string[];
};

export type InitializationStruct = {
  initContract: PromiseOrValue<string>;
  initData: PromiseOrValue<BytesLike>;
};

export type InitializationStructOutput = [string, string] & {
  initContract: string;
  initData: string;
};

export interface DiamondInterface extends utils.Interface {
  functions: {};

  events: {
    'DiamondCut(tuple[],address,bytes)': EventFragment;
    'Initialized(address,uint96)': EventFragment;
    'OwnershipTransferred(address,address)': EventFragment;
    'RoleGranted(bytes32,address,address)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'DiamondCut'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'Initialized'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'OwnershipTransferred'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'RoleGranted'): EventFragment;
}

export interface DiamondCutEventObject {
  _diamondCut: FacetCutStructOutput[];
  _init: string;
  _calldata: string;
}
export type DiamondCutEvent = TypedEvent<[FacetCutStructOutput[], string, string], DiamondCutEventObject>;

export type DiamondCutEventFilter = TypedEventFilter<DiamondCutEvent>;

export interface InitializedEventObject {
  operator: string;
  version: BigNumber;
}
export type InitializedEvent = TypedEvent<[string, BigNumber], InitializedEventObject>;

export type InitializedEventFilter = TypedEventFilter<InitializedEvent>;

export interface OwnershipTransferredEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferredEvent = TypedEvent<[string, string], OwnershipTransferredEventObject>;

export type OwnershipTransferredEventFilter = TypedEventFilter<OwnershipTransferredEvent>;

export interface RoleGrantedEventObject {
  role: string;
  account: string;
  sender: string;
}
export type RoleGrantedEvent = TypedEvent<[string, string, string], RoleGrantedEventObject>;

export type RoleGrantedEventFilter = TypedEventFilter<RoleGrantedEvent>;

export interface Diamond extends BaseContract {
  contractName: 'Diamond';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: DiamondInterface;

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
    'DiamondCut(tuple[],address,bytes)'(_diamondCut?: null, _init?: null, _calldata?: null): DiamondCutEventFilter;
    DiamondCut(_diamondCut?: null, _init?: null, _calldata?: null): DiamondCutEventFilter;

    'Initialized(address,uint96)'(operator?: PromiseOrValue<string> | null, version?: null): InitializedEventFilter;
    Initialized(operator?: PromiseOrValue<string> | null, version?: null): InitializedEventFilter;

    'OwnershipTransferred(address,address)'(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null,
    ): OwnershipTransferredEventFilter;
    OwnershipTransferred(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null,
    ): OwnershipTransferredEventFilter;

    'RoleGranted(bytes32,address,address)'(
      role?: PromiseOrValue<BytesLike> | null,
      account?: PromiseOrValue<string> | null,
      sender?: PromiseOrValue<string> | null,
    ): RoleGrantedEventFilter;
    RoleGranted(
      role?: PromiseOrValue<BytesLike> | null,
      account?: PromiseOrValue<string> | null,
      sender?: PromiseOrValue<string> | null,
    ): RoleGrantedEventFilter;
  };

  estimateGas: {};

  populateTransaction: {};
}
