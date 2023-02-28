import type { Provider } from "@ethersproject/abstract-provider";
import { CallOverrides, Contract } from "@ethersproject/contracts";
import type { Signer } from "@ethersproject/abstract-signer";
import * as Contracts from "./types";
import { DeploymentNames, opgoerli } from "./deployments";

export type KreskoAssetNames =
    | Exclude<
          Split<SplitReverse<keyof typeof opgoerli, "kr">, "_">[0],
          "Implementation" | "Proxy" | "krREWARD" | "krETHRATE"
      >
    | "KISS";

export type AllTokenDeployments = Pick<typeof opgoerli, KreskoAssetNames | "WETH" | "DAI" | "OP" | "wBTC">;
export type AllTokenNames = keyof Pick<typeof opgoerli, KreskoAssetNames | "WETH" | "DAI" | "OP" | "wBTC">;

export type CollateralAssetNames = keyof AllTokenDeployments;

export type Split<S extends string, D extends string> = string extends S
    ? string[]
    : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
    ? [T, ...Split<U, D>]
    : [S];

export type SplitReverse<S extends string, D extends string> = string extends S
    ? string[]
    : S extends ""
    ? []
    : S extends `${D}${infer U}`
    ? `${D}${U}`
    : never;

export type ExcludeType<T, E> = {
    [K in keyof T]: T[K] extends E ? K : never;
}[keyof T];

export type MinEthersFactoryExt<C> = {
    connect(address: string, signerOrProvider: any): C;
};
export type MinTokenFactoryExt = {
    symbol(overrides?: CallOverrides): Promise<[string]>;
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
    [key in Exclude<KreskoAssetNames, "KISS">]: Contracts.KreskoAsset;
} & {
    Diamond: Contracts.Kresko;
    wBTC: Contracts.wBTC;
} & {
    [key in Exclude<CollateralAssetNames, KreskoAssetNames | "WETH" | "wBTC" | "KISS">]: Contracts.ERC20Upgradeable;
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
