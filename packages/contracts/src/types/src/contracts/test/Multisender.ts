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
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "../../../common";

export type TokenStruct = {
    amount: PromiseOrValue<BigNumberish>;
    token: PromiseOrValue<string>;
};

export type TokenStructOutput = [BigNumber, string] & {
    amount: BigNumber;
    token: string;
};

export interface MultisenderInterface extends utils.Interface {
    functions: {
        "addToken((uint256,address))": FunctionFragment;
        "distribute(address[],uint256,uint256,uint256)": FunctionFragment;
        "drain()": FunctionFragment;
        "drainERC20()": FunctionFragment;
        "funded(address)": FunctionFragment;
        "owners(address)": FunctionFragment;
        "setTokens((uint256,address)[])": FunctionFragment;
        "toggleOwners(address[])": FunctionFragment;
    };

    getFunction(
        nameOrSignatureOrTopic:
            | "addToken"
            | "addToken((uint256,address))"
            | "distribute"
            | "distribute(address[],uint256,uint256,uint256)"
            | "drain"
            | "drain()"
            | "drainERC20"
            | "drainERC20()"
            | "funded"
            | "funded(address)"
            | "owners"
            | "owners(address)"
            | "setTokens"
            | "setTokens((uint256,address)[])"
            | "toggleOwners"
            | "toggleOwners(address[])",
    ): FunctionFragment;

    encodeFunctionData(functionFragment: "addToken", values: [TokenStruct]): string;
    encodeFunctionData(functionFragment: "addToken((uint256,address))", values: [TokenStruct]): string;
    encodeFunctionData(
        functionFragment: "distribute",
        values: [
            PromiseOrValue<string>[],
            PromiseOrValue<BigNumberish>,
            PromiseOrValue<BigNumberish>,
            PromiseOrValue<BigNumberish>,
        ],
    ): string;
    encodeFunctionData(
        functionFragment: "distribute(address[],uint256,uint256,uint256)",
        values: [
            PromiseOrValue<string>[],
            PromiseOrValue<BigNumberish>,
            PromiseOrValue<BigNumberish>,
            PromiseOrValue<BigNumberish>,
        ],
    ): string;
    encodeFunctionData(functionFragment: "drain", values?: undefined): string;
    encodeFunctionData(functionFragment: "drain()", values?: undefined): string;
    encodeFunctionData(functionFragment: "drainERC20", values?: undefined): string;
    encodeFunctionData(functionFragment: "drainERC20()", values?: undefined): string;
    encodeFunctionData(functionFragment: "funded", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "funded(address)", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "owners", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "owners(address)", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "setTokens", values: [TokenStruct[]]): string;
    encodeFunctionData(functionFragment: "setTokens((uint256,address)[])", values: [TokenStruct[]]): string;
    encodeFunctionData(functionFragment: "toggleOwners", values: [PromiseOrValue<string>[]]): string;
    encodeFunctionData(functionFragment: "toggleOwners(address[])", values: [PromiseOrValue<string>[]]): string;

    decodeFunctionResult(functionFragment: "addToken", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addToken((uint256,address))", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "distribute", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "distribute(address[],uint256,uint256,uint256)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "drain", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "drain()", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "drainERC20", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "drainERC20()", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "funded", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "funded(address)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "owners", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "owners(address)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setTokens", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setTokens((uint256,address)[])", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "toggleOwners", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "toggleOwners(address[])", data: BytesLike): Result;

    events: {
        "Funded(address)": EventFragment;
    };

    getEvent(nameOrSignatureOrTopic: "Funded"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "Funded(address)"): EventFragment;
}

export interface FundedEventObject {
    account: string;
}
export type FundedEvent = TypedEvent<[string], FundedEventObject>;

export type FundedEventFilter = TypedEventFilter<FundedEvent>;

export interface Multisender extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;

    interface: MultisenderInterface;

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
        addToken(
            _token: TokenStruct,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        "addToken((uint256,address))"(
            _token: TokenStruct,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        distribute(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        "distribute(address[],uint256,uint256,uint256)"(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        drain(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

        "drain()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

        drainERC20(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

        "drainERC20()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

        funded(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

        "funded(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

        owners(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

        "owners(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;

        setTokens(
            _tokens: TokenStruct[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        "setTokens((uint256,address)[])"(
            _tokens: TokenStruct[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        toggleOwners(
            accounts: PromiseOrValue<string>[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;

        "toggleOwners(address[])"(
            accounts: PromiseOrValue<string>[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<ContractTransaction>;
    };

    addToken(
        _token: TokenStruct,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    "addToken((uint256,address))"(
        _token: TokenStruct,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    distribute(
        accounts: PromiseOrValue<string>[],
        wethAmount: PromiseOrValue<BigNumberish>,
        ethAmount: PromiseOrValue<BigNumberish>,
        kissAmount: PromiseOrValue<BigNumberish>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    "distribute(address[],uint256,uint256,uint256)"(
        accounts: PromiseOrValue<string>[],
        wethAmount: PromiseOrValue<BigNumberish>,
        ethAmount: PromiseOrValue<BigNumberish>,
        kissAmount: PromiseOrValue<BigNumberish>,
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    drain(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

    "drain()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

    drainERC20(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

    "drainERC20()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<ContractTransaction>;

    funded(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    "funded(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    owners(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    "owners(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

    setTokens(
        _tokens: TokenStruct[],
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    "setTokens((uint256,address)[])"(
        _tokens: TokenStruct[],
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    toggleOwners(
        accounts: PromiseOrValue<string>[],
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    "toggleOwners(address[])"(
        accounts: PromiseOrValue<string>[],
        overrides?: Overrides & { from?: PromiseOrValue<string> },
    ): Promise<ContractTransaction>;

    callStatic: {
        addToken(_token: TokenStruct, overrides?: CallOverrides): Promise<void>;

        "addToken((uint256,address))"(_token: TokenStruct, overrides?: CallOverrides): Promise<void>;

        distribute(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: CallOverrides,
        ): Promise<void>;

        "distribute(address[],uint256,uint256,uint256)"(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: CallOverrides,
        ): Promise<void>;

        drain(overrides?: CallOverrides): Promise<void>;

        "drain()"(overrides?: CallOverrides): Promise<void>;

        drainERC20(overrides?: CallOverrides): Promise<void>;

        "drainERC20()"(overrides?: CallOverrides): Promise<void>;

        funded(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

        "funded(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

        owners(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

        "owners(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;

        setTokens(_tokens: TokenStruct[], overrides?: CallOverrides): Promise<void>;

        "setTokens((uint256,address)[])"(_tokens: TokenStruct[], overrides?: CallOverrides): Promise<void>;

        toggleOwners(accounts: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<void>;

        "toggleOwners(address[])"(accounts: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<void>;
    };

    filters: {
        "Funded(address)"(account?: PromiseOrValue<string> | null): FundedEventFilter;
        Funded(account?: PromiseOrValue<string> | null): FundedEventFilter;
    };

    estimateGas: {
        addToken(_token: TokenStruct, overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<BigNumber>;

        "addToken((uint256,address))"(
            _token: TokenStruct,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        distribute(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        "distribute(address[],uint256,uint256,uint256)"(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        drain(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<BigNumber>;

        "drain()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<BigNumber>;

        drainERC20(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<BigNumber>;

        "drainERC20()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<BigNumber>;

        funded(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

        "funded(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

        owners(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

        "owners(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;

        setTokens(
            _tokens: TokenStruct[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        "setTokens((uint256,address)[])"(
            _tokens: TokenStruct[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        toggleOwners(
            accounts: PromiseOrValue<string>[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;

        "toggleOwners(address[])"(
            accounts: PromiseOrValue<string>[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<BigNumber>;
    };

    populateTransaction: {
        addToken(
            _token: TokenStruct,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        "addToken((uint256,address))"(
            _token: TokenStruct,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        distribute(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        "distribute(address[],uint256,uint256,uint256)"(
            accounts: PromiseOrValue<string>[],
            wethAmount: PromiseOrValue<BigNumberish>,
            ethAmount: PromiseOrValue<BigNumberish>,
            kissAmount: PromiseOrValue<BigNumberish>,
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        drain(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<PopulatedTransaction>;

        "drain()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<PopulatedTransaction>;

        drainERC20(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<PopulatedTransaction>;

        "drainERC20()"(overrides?: Overrides & { from?: PromiseOrValue<string> }): Promise<PopulatedTransaction>;

        funded(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "funded(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        owners(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        "owners(address)"(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;

        setTokens(
            _tokens: TokenStruct[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        "setTokens((uint256,address)[])"(
            _tokens: TokenStruct[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        toggleOwners(
            accounts: PromiseOrValue<string>[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;

        "toggleOwners(address[])"(
            accounts: PromiseOrValue<string>[],
            overrides?: Overrides & { from?: PromiseOrValue<string> },
        ): Promise<PopulatedTransaction>;
    };
}
