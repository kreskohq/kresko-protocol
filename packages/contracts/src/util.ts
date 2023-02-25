import type { Provider } from "@ethersproject/abstract-provider";
import { Contract } from "@ethersproject/contracts";
import type { Signer } from "@ethersproject/abstract-signer";
import { Assets } from "@kreskolabs/configs";
import * as Contracts from "./types";
import { DeploymentNames, opgoerli } from "./deployments";

export type Split<S extends string, D extends string> = string extends S
    ? string[]
    : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
    ? [T, ...Split<U, D>]
    : [S];
export type ExcludeType<T, E> = {
    [K in keyof T]: T[K] extends E ? K : never;
}[keyof T];

export type MinEthersFactoryExt<C> = {
    connect(address: string, signerOrProvider: any): C;
};
export type InferContractType<Factory> = Factory extends MinEthersFactoryExt<infer C> ? C : unknown;

export type KeyValue<T = unknown> = {
    [key: string]: T;
};
export type FactoryName<T extends KeyValue> = Exclude<keyof T, "factories" | "hardhatDiamondAbi" | "src">;
export type InferName<T extends KeyValue, Excludes = "factories" | "hardhatDiamondAbi" | "src"> = Split<
    Exclude<keyof T extends string ? keyof T : never, Excludes>,
    "__factory"
>[0];

export type GetContractTypes<T extends KeyValue> = {
    [K in FactoryName<T> as `${Split<K extends string ? K : never, "__factory">[0]}`]: InferContractType<T[K]>;
};

export type TC = GetContractTypes<typeof Contracts> & {
    [key in Assets]: Contracts.KreskoAsset;
} & {
    Diamond: Contracts.Kresko;
};

export function getInstance<T extends keyof TC>(name: T): TC[T] {
    const deploymentId = name === "Kresko" ? "Diamond" : name;
    // @ts-expect-error
    return new Contract(opgoerli[deploymentId].address, opgoerli[deploymentId].abi) as TC[T];
}
export function getContractById<T extends keyof TC>(
    deploymentId: DeploymentNames,
    type: T,
    signerOrProvider: Signer | Provider,
): TC[T] {
    type === "Kresko" ? "Diamond" : type;
    // @ts-expect-error
    return new Contract(opgoerli[deploymentId].address, opgoerli[deploymentId].abi, signerOrProvider) as TC[T];
}
export function getContractAt<T extends keyof TC>(
    address: string,
    type: T,
    signerOrProvider: Signer | Provider,
): TC[T] {
    const deploymentId = type === "Kresko" ? "Diamond" : type;
    // @ts-expect-error
    return new Contract(address, opgoerli[deploymentId].abi, signerOrProvider) as TC[T];
}

export function getContract<T extends keyof TC>(name: T, signerOrProvider: Signer | Provider): TC[T] {
    const deploymentId = name === "Kresko" ? "Diamond" : name;
    // @ts-expect-error
    return new Contract(opgoerli[deploymentId].address, opgoerli[deploymentId].abi, signerOrProvider) as TC[T];
}
