/* Autogenerated file. Do not edit manually. */
// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from 'ethers';
import type { FunctionFragment, Result } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from '../../../../../common';

export interface ERC165FacetInterface extends utils.Interface {
  functions: {
    'setERC165(bytes4[],bytes4[])': FunctionFragment;
    'supportsInterface(bytes4)': FunctionFragment;
  };

  getFunction(nameOrSignatureOrTopic: 'setERC165' | 'supportsInterface'): FunctionFragment;

  encodeFunctionData(
    functionFragment: 'setERC165',
    values: [PromiseOrValue<BytesLike>[], PromiseOrValue<BytesLike>[]],
  ): string;
  encodeFunctionData(functionFragment: 'supportsInterface', values: [PromiseOrValue<BytesLike>]): string;

  decodeFunctionResult(functionFragment: 'setERC165', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'supportsInterface', data: BytesLike): Result;

  events: {};
}

export interface ERC165Facet extends BaseContract {
  contractName: 'ERC165Facet';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ERC165FacetInterface;

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
    setERC165(
      interfaceIds: PromiseOrValue<BytesLike>[],
      interfaceIdsToRemove: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    supportsInterface(_interfaceId: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<[boolean]>;
  };

  setERC165(
    interfaceIds: PromiseOrValue<BytesLike>[],
    interfaceIdsToRemove: PromiseOrValue<BytesLike>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  supportsInterface(_interfaceId: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<boolean>;

  callStatic: {
    setERC165(
      interfaceIds: PromiseOrValue<BytesLike>[],
      interfaceIdsToRemove: PromiseOrValue<BytesLike>[],
      overrides?: CallOverrides,
    ): Promise<void>;

    supportsInterface(_interfaceId: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<boolean>;
  };

  filters: {};

  estimateGas: {
    setERC165(
      interfaceIds: PromiseOrValue<BytesLike>[],
      interfaceIdsToRemove: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    supportsInterface(_interfaceId: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    setERC165(
      interfaceIds: PromiseOrValue<BytesLike>[],
      interfaceIdsToRemove: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    supportsInterface(
      _interfaceId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;
  };
}
