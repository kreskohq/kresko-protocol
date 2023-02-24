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
export type InferContractType<Factory> = Factory extends MinEthersFactoryExt<
  infer C
>
  ? C
  : unknown;

type KeyValue<T = unknown> = {
  [key: string]: T;
};
export type FactoryName<T extends KeyValue> = Exclude<keyof T, "factories">;
export type ContractName<
  T extends KeyValue,
  Excludes = "factories" | "hardhatDiamondAbi"
> = Split<
  Exclude<keyof T extends string ? keyof T : never, Excludes>,
  "__factory"
>[0];

export type GetContractTypes<T extends KeyValue> = {
  [K in FactoryName<T> as `${Split<
    K extends string ? K : never,
    "__factory"
  >[0]}`]: InferContractType<T[K]>;
};
