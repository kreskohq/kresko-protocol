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

export interface MockOracleInterface extends utils.Interface {
  functions: {
    'decimals()': FunctionFragment;
    'description()': FunctionFragment;
    'getRoundData(uint80)': FunctionFragment;
    'initialAnswer()': FunctionFragment;
    'latestRoundData()': FunctionFragment;
    'price()': FunctionFragment;
    'setPrice(uint256)': FunctionFragment;
    'version()': FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | 'decimals'
      | 'description'
      | 'getRoundData'
      | 'initialAnswer'
      | 'latestRoundData'
      | 'price'
      | 'setPrice'
      | 'version',
  ): FunctionFragment;

  encodeFunctionData(functionFragment: 'decimals', values?: undefined): string;
  encodeFunctionData(functionFragment: 'description', values?: undefined): string;
  encodeFunctionData(functionFragment: 'getRoundData', values: [PromiseOrValue<BigNumberish>]): string;
  encodeFunctionData(functionFragment: 'initialAnswer', values?: undefined): string;
  encodeFunctionData(functionFragment: 'latestRoundData', values?: undefined): string;
  encodeFunctionData(functionFragment: 'price', values?: undefined): string;
  encodeFunctionData(functionFragment: 'setPrice', values: [PromiseOrValue<BigNumberish>]): string;
  encodeFunctionData(functionFragment: 'version', values?: undefined): string;

  decodeFunctionResult(functionFragment: 'decimals', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'description', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'getRoundData', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'initialAnswer', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'latestRoundData', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'price', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'setPrice', data: BytesLike): Result;
  decodeFunctionResult(functionFragment: 'version', data: BytesLike): Result;

  events: {
    'AnswerUpdated(int256,uint256,uint256)': EventFragment;
    'NewRound(uint256,address,uint256)': EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: 'AnswerUpdated'): EventFragment;
  getEvent(nameOrSignatureOrTopic: 'NewRound'): EventFragment;
}

export interface AnswerUpdatedEventObject {
  current: BigNumber;
  roundId: BigNumber;
  updatedAt: BigNumber;
}
export type AnswerUpdatedEvent = TypedEvent<[BigNumber, BigNumber, BigNumber], AnswerUpdatedEventObject>;

export type AnswerUpdatedEventFilter = TypedEventFilter<AnswerUpdatedEvent>;

export interface NewRoundEventObject {
  roundId: BigNumber;
  startedBy: string;
  startedAt: BigNumber;
}
export type NewRoundEvent = TypedEvent<[BigNumber, string, BigNumber], NewRoundEventObject>;

export type NewRoundEventFilter = TypedEventFilter<NewRoundEvent>;

export interface MockOracle extends BaseContract {
  contractName: 'MockOracle';

  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: MockOracleInterface;

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
    decimals(overrides?: CallOverrides): Promise<[number]>;

    description(overrides?: CallOverrides): Promise<[string]>;

    getRoundData(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        roundId: BigNumber;
        answer: BigNumber;
        startedAt: BigNumber;
        updatedAt: BigNumber;
        answeredInRound: BigNumber;
      }
    >;

    initialAnswer(overrides?: CallOverrides): Promise<[BigNumber]>;

    latestRoundData(overrides?: CallOverrides): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        roundId: BigNumber;
        answer: BigNumber;
        startedAt: BigNumber;
        updatedAt: BigNumber;
        answeredInRound: BigNumber;
      }
    >;

    price(overrides?: CallOverrides): Promise<[BigNumber]>;

    setPrice(
      _answer: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    version(overrides?: CallOverrides): Promise<[BigNumber]>;
  };

  decimals(overrides?: CallOverrides): Promise<number>;

  description(overrides?: CallOverrides): Promise<string>;

  getRoundData(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides,
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
      roundId: BigNumber;
      answer: BigNumber;
      startedAt: BigNumber;
      updatedAt: BigNumber;
      answeredInRound: BigNumber;
    }
  >;

  initialAnswer(overrides?: CallOverrides): Promise<BigNumber>;

  latestRoundData(overrides?: CallOverrides): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
      roundId: BigNumber;
      answer: BigNumber;
      startedAt: BigNumber;
      updatedAt: BigNumber;
      answeredInRound: BigNumber;
    }
  >;

  price(overrides?: CallOverrides): Promise<BigNumber>;

  setPrice(
    _answer: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> },
  ): Promise<ContractTransaction>;

  version(overrides?: CallOverrides): Promise<BigNumber>;

  callStatic: {
    decimals(overrides?: CallOverrides): Promise<number>;

    description(overrides?: CallOverrides): Promise<string>;

    getRoundData(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides,
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        roundId: BigNumber;
        answer: BigNumber;
        startedAt: BigNumber;
        updatedAt: BigNumber;
        answeredInRound: BigNumber;
      }
    >;

    initialAnswer(overrides?: CallOverrides): Promise<BigNumber>;

    latestRoundData(overrides?: CallOverrides): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        roundId: BigNumber;
        answer: BigNumber;
        startedAt: BigNumber;
        updatedAt: BigNumber;
        answeredInRound: BigNumber;
      }
    >;

    price(overrides?: CallOverrides): Promise<BigNumber>;

    setPrice(_answer: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<void>;

    version(overrides?: CallOverrides): Promise<BigNumber>;
  };

  filters: {
    'AnswerUpdated(int256,uint256,uint256)'(
      current?: PromiseOrValue<BigNumberish> | null,
      roundId?: PromiseOrValue<BigNumberish> | null,
      updatedAt?: null,
    ): AnswerUpdatedEventFilter;
    AnswerUpdated(
      current?: PromiseOrValue<BigNumberish> | null,
      roundId?: PromiseOrValue<BigNumberish> | null,
      updatedAt?: null,
    ): AnswerUpdatedEventFilter;

    'NewRound(uint256,address,uint256)'(
      roundId?: PromiseOrValue<BigNumberish> | null,
      startedBy?: PromiseOrValue<string> | null,
      startedAt?: null,
    ): NewRoundEventFilter;
    NewRound(
      roundId?: PromiseOrValue<BigNumberish> | null,
      startedBy?: PromiseOrValue<string> | null,
      startedAt?: null,
    ): NewRoundEventFilter;
  };

  estimateGas: {
    decimals(overrides?: CallOverrides): Promise<BigNumber>;

    description(overrides?: CallOverrides): Promise<BigNumber>;

    getRoundData(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;

    initialAnswer(overrides?: CallOverrides): Promise<BigNumber>;

    latestRoundData(overrides?: CallOverrides): Promise<BigNumber>;

    price(overrides?: CallOverrides): Promise<BigNumber>;

    setPrice(
      _answer: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<BigNumber>;

    version(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    decimals(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    description(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getRoundData(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    initialAnswer(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    latestRoundData(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    price(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setPrice(
      _answer: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<PopulatedTransaction>;

    version(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
