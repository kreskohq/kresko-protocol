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
} from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "../../../../common";

export interface FluxPriceFeedFactoryInterface extends utils.Interface {
    functions: {
        "VALIDATOR_ROLE()": FunctionFragment;
        "addressOfPricePair(string,uint8,address)": FunctionFragment;
        "addressOfPricePairId(bytes32)": FunctionFragment;
        "fluxPriceFeeds(bytes32)": FunctionFragment;
        "getId(string,uint8,address)": FunctionFragment;
        "owner()": FunctionFragment;
        "transferOwnership(address)": FunctionFragment;
        "transmit(string[],uint8[],int192[],bool[],address)": FunctionFragment;
        "typeAndVersion()": FunctionFragment;
        "valueFor(bytes32)": FunctionFragment;
    };

    getFunction(
        nameOrSignatureOrTopic:
            | "VALIDATOR_ROLE"
            | "VALIDATOR_ROLE()"
            | "addressOfPricePair"
            | "addressOfPricePair(string,uint8,address)"
            | "addressOfPricePairId"
            | "addressOfPricePairId(bytes32)"
            | "fluxPriceFeeds"
            | "fluxPriceFeeds(bytes32)"
            | "getId"
            | "getId(string,uint8,address)"
            | "owner"
            | "owner()"
            | "transferOwnership"
            | "transferOwnership(address)"
            | "transmit"
            | "transmit(string[],uint8[],int192[],bool[],address)"
            | "typeAndVersion"
            | "typeAndVersion()"
            | "valueFor"
            | "valueFor(bytes32)",
    ): FunctionFragment;

    encodeFunctionData(functionFragment: "VALIDATOR_ROLE", values?: undefined): string;
    encodeFunctionData(functionFragment: "VALIDATOR_ROLE()", values?: undefined): string;
    encodeFunctionData(
        functionFragment: "addressOfPricePair",
        values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>, PromiseOrValue<string>],
    ): string;
    encodeFunctionData(
        functionFragment: "addressOfPricePair(string,uint8,address)",
        values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>, PromiseOrValue<string>],
    ): string;
    encodeFunctionData(functionFragment: "addressOfPricePairId", values: [PromiseOrValue<BytesLike>]): string;
    encodeFunctionData(functionFragment: "addressOfPricePairId(bytes32)", values: [PromiseOrValue<BytesLike>]): string;
    encodeFunctionData(functionFragment: "fluxPriceFeeds", values: [PromiseOrValue<BytesLike>]): string;
    encodeFunctionData(functionFragment: "fluxPriceFeeds(bytes32)", values: [PromiseOrValue<BytesLike>]): string;
    encodeFunctionData(
        functionFragment: "getId",
        values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>, PromiseOrValue<string>],
    ): string;
    encodeFunctionData(
        functionFragment: "getId(string,uint8,address)",
        values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>, PromiseOrValue<string>],
    ): string;
    encodeFunctionData(functionFragment: "owner", values?: undefined): string;
    encodeFunctionData(functionFragment: "owner()", values?: undefined): string;
    encodeFunctionData(functionFragment: "transferOwnership", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "transferOwnership(address)", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(
        functionFragment: "transmit",
        values: [
            PromiseOrValue<string>[],
            PromiseOrValue<BigNumberish>[],
            PromiseOrValue<BigNumberish>[],
            PromiseOrValue<boolean>[],
            PromiseOrValue<string>,
        ],
    ): string;
    encodeFunctionData(
        functionFragment: "transmit(string[],uint8[],int192[],bool[],address)",
        values: [
            PromiseOrValue<string>[],
            PromiseOrValue<BigNumberish>[],
            PromiseOrValue<BigNumberish>[],
            PromiseOrValue<boolean>[],
            PromiseOrValue<string>,
        ],
    ): string;
    encodeFunctionData(functionFragment: "typeAndVersion", values?: undefined): string;
    encodeFunctionData(functionFragment: "typeAndVersion()", values?: undefined): string;
    encodeFunctionData(functionFragment: "valueFor", values: [PromiseOrValue<BytesLike>]): string;
    encodeFunctionData(functionFragment: "valueFor(bytes32)", values: [PromiseOrValue<BytesLike>]): string;

    decodeFunctionResult(functionFragment: "VALIDATOR_ROLE", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "VALIDATOR_ROLE()", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addressOfPricePair", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addressOfPricePair(string,uint8,address)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addressOfPricePairId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addressOfPricePairId(bytes32)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "fluxPriceFeeds", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "fluxPriceFeeds(bytes32)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getId(string,uint8,address)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "owner()", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transferOwnership", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transferOwnership(address)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transmit", data: BytesLike): Result;
    decodeFunctionResult(
        functionFragment: "transmit(string[],uint8[],int192[],bool[],address)",
        data: BytesLike,
    ): Result;
    decodeFunctionResult(functionFragment: "typeAndVersion", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "typeAndVersion()", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "valueFor", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "valueFor(bytes32)", data: BytesLike): Result;

    events: {
        "FluxPriceFeedCreated(bytes32,address)": EventFragment;
        "Log(string)": EventFragment;
    };

    getEvent(nameOrSignatureOrTopic: "FluxPriceFeedCreated"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "FluxPriceFeedCreated(bytes32,address)"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "Log"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "Log(string)"): EventFragment;
}

export interface FluxPriceFeedCreatedEventObject {
    id: string;
    oracle: string;
}
export type FluxPriceFeedCreatedEvent = TypedEvent<[string, string], FluxPriceFeedCreatedEventObject>;

export type FluxPriceFeedCreatedEventFilter = TypedEventFilter<FluxPriceFeedCreatedEvent>;

export interface LogEventObject {
    message: string;
}
export type LogEvent = TypedEvent<[string], LogEventObject>;

export type LogEventFilter = TypedEventFilter<LogEvent>;

export interface FluxPriceFeedFactory extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;

    interface: FluxPriceFeedFactoryInterface;

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
        VALIDATOR_ROLE(overrides?: CallOverrides): Promise<[string]>;

        "VALIDATOR_ROLE()"(overrides?: CallOverrides): Promise<[string]>;

        addressOfPricePair(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<[string]>;

        "addressOfPricePair(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<[string]>;

        addressOfPricePairId(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<[string]>;

        "addressOfPricePairId(bytes32)"(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<[string]>;

        fluxPriceFeeds(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<[string]>;

        "fluxPriceFeeds(bytes32)"(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<[string]>;

        getId(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<[string]>;

        "getId(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<[string]>;

        owner(overrides?: CallOverrides): Promise<[string]>;

        "owner()"(overrides?: CallOverrides): Promise<[string]>;

        transferOwnership(
            newOwner: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        "transferOwnership(address)"(
            newOwner: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        transmit(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        "transmit(string[],uint8[],int192[],bool[],address)"(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        typeAndVersion(overrides?: CallOverrides): Promise<[string]>;

        "typeAndVersion()"(overrides?: CallOverrides): Promise<[string]>;

        valueFor(
            _id: PromiseOrValue<BytesLike>,
            overrides?: CallOverrides,
        ): Promise<[BigNumber, boolean, BigNumber, BigNumber]>;

        "valueFor(bytes32)"(
            _id: PromiseOrValue<BytesLike>,
            overrides?: CallOverrides,
        ): Promise<[BigNumber, boolean, BigNumber, BigNumber]>;
    };

    VALIDATOR_ROLE(overrides?: CallOverrides): Promise<string>;

    "VALIDATOR_ROLE()"(overrides?: CallOverrides): Promise<string>;

    addressOfPricePair(
        _pricePair: PromiseOrValue<string>,
        _decimals: PromiseOrValue<BigNumberish>,
        _provider: PromiseOrValue<string>,
        overrides?: CallOverrides,
    ): Promise<string>;

    "addressOfPricePair(string,uint8,address)"(
        _pricePair: PromiseOrValue<string>,
        _decimals: PromiseOrValue<BigNumberish>,
        _provider: PromiseOrValue<string>,
        overrides?: CallOverrides,
    ): Promise<string>;

    addressOfPricePairId(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

    "addressOfPricePairId(bytes32)"(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

    fluxPriceFeeds(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

    "fluxPriceFeeds(bytes32)"(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

    getId(
        _pricePair: PromiseOrValue<string>,
        _decimals: PromiseOrValue<BigNumberish>,
        _provider: PromiseOrValue<string>,
        overrides?: CallOverrides,
    ): Promise<string>;

    "getId(string,uint8,address)"(
        _pricePair: PromiseOrValue<string>,
        _decimals: PromiseOrValue<BigNumberish>,
        _provider: PromiseOrValue<string>,
        overrides?: CallOverrides,
    ): Promise<string>;

    owner(overrides?: CallOverrides): Promise<string>;

    "owner()"(overrides?: CallOverrides): Promise<string>;

    transferOwnership(
        newOwner: PromiseOrValue<string>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    "transferOwnership(address)"(
        newOwner: PromiseOrValue<string>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    transmit(
        _pricePairs: PromiseOrValue<string>[],
        _decimals: PromiseOrValue<BigNumberish>[],
        _answers: PromiseOrValue<BigNumberish>[],
        _marketStatusAnswers: PromiseOrValue<boolean>[],
        _provider: PromiseOrValue<string>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    "transmit(string[],uint8[],int192[],bool[],address)"(
        _pricePairs: PromiseOrValue<string>[],
        _decimals: PromiseOrValue<BigNumberish>[],
        _answers: PromiseOrValue<BigNumberish>[],
        _marketStatusAnswers: PromiseOrValue<boolean>[],
        _provider: PromiseOrValue<string>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    typeAndVersion(overrides?: CallOverrides): Promise<string>;

    "typeAndVersion()"(overrides?: CallOverrides): Promise<string>;

    valueFor(
        _id: PromiseOrValue<BytesLike>,
        overrides?: CallOverrides,
    ): Promise<[BigNumber, boolean, BigNumber, BigNumber]>;

    "valueFor(bytes32)"(
        _id: PromiseOrValue<BytesLike>,
        overrides?: CallOverrides,
    ): Promise<[BigNumber, boolean, BigNumber, BigNumber]>;

    callStatic: {
        VALIDATOR_ROLE(overrides?: CallOverrides): Promise<string>;

        "VALIDATOR_ROLE()"(overrides?: CallOverrides): Promise<string>;

        addressOfPricePair(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<string>;

        "addressOfPricePair(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<string>;

        addressOfPricePairId(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

        "addressOfPricePairId(bytes32)"(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

        fluxPriceFeeds(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

        "fluxPriceFeeds(bytes32)"(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<string>;

        getId(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<string>;

        "getId(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<string>;

        owner(overrides?: CallOverrides): Promise<string>;

        "owner()"(overrides?: CallOverrides): Promise<string>;

        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

        "transferOwnership(address)"(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;

        transmit(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<void>;

        "transmit(string[],uint8[],int192[],bool[],address)"(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<void>;

        typeAndVersion(overrides?: CallOverrides): Promise<string>;

        "typeAndVersion()"(overrides?: CallOverrides): Promise<string>;

        valueFor(
            _id: PromiseOrValue<BytesLike>,
            overrides?: CallOverrides,
        ): Promise<[BigNumber, boolean, BigNumber, BigNumber]>;

        "valueFor(bytes32)"(
            _id: PromiseOrValue<BytesLike>,
            overrides?: CallOverrides,
        ): Promise<[BigNumber, boolean, BigNumber, BigNumber]>;
    };

    filters: {
        "FluxPriceFeedCreated(bytes32,address)"(
            id?: PromiseOrValue<BytesLike> | null,
            oracle?: PromiseOrValue<string> | null,
        ): FluxPriceFeedCreatedEventFilter;
        FluxPriceFeedCreated(
            id?: PromiseOrValue<BytesLike> | null,
            oracle?: PromiseOrValue<string> | null,
        ): FluxPriceFeedCreatedEventFilter;

        "Log(string)"(message?: null): LogEventFilter;
        Log(message?: null): LogEventFilter;
    };

    estimateGas: {
        VALIDATOR_ROLE(overrides?: CallOverrides): Promise<BigNumber>;

        "VALIDATOR_ROLE()"(overrides?: CallOverrides): Promise<BigNumber>;

        addressOfPricePair(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        "addressOfPricePair(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        addressOfPricePairId(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;

        "addressOfPricePairId(bytes32)"(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;

        fluxPriceFeeds(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;

        "fluxPriceFeeds(bytes32)"(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;

        getId(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        "getId(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        owner(overrides?: CallOverrides): Promise<BigNumber>;

        "owner()"(overrides?: CallOverrides): Promise<BigNumber>;

        transferOwnership(
            newOwner: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        "transferOwnership(address)"(
            newOwner: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        transmit(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        "transmit(string[],uint8[],int192[],bool[],address)"(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        typeAndVersion(overrides?: CallOverrides): Promise<BigNumber>;

        "typeAndVersion()"(overrides?: CallOverrides): Promise<BigNumber>;

        valueFor(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;

        "valueFor(bytes32)"(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;
    };

    populateTransaction: {
        VALIDATOR_ROLE(overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "VALIDATOR_ROLE()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

        addressOfPricePair(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        "addressOfPricePair(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        addressOfPricePairId(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "addressOfPricePairId(bytes32)"(
            _id: PromiseOrValue<BytesLike>,
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        fluxPriceFeeds(arg0: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "fluxPriceFeeds(bytes32)"(
            arg0: PromiseOrValue<BytesLike>,
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        getId(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        "getId(string,uint8,address)"(
            _pricePair: PromiseOrValue<string>,
            _decimals: PromiseOrValue<BigNumberish>,
            _provider: PromiseOrValue<string>,
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "owner()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

        transferOwnership(
            newOwner: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        "transferOwnership(address)"(
            newOwner: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        transmit(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        "transmit(string[],uint8[],int192[],bool[],address)"(
            _pricePairs: PromiseOrValue<string>[],
            _decimals: PromiseOrValue<BigNumberish>[],
            _answers: PromiseOrValue<BigNumberish>[],
            _marketStatusAnswers: PromiseOrValue<boolean>[],
            _provider: PromiseOrValue<string>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        typeAndVersion(overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "typeAndVersion()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

        valueFor(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "valueFor(bytes32)"(_id: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
