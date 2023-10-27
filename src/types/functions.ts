import type { FuncArgs, FuncNames, IsUndefined } from '@/types';
import { commonUtils } from '@config/hardhat/extensions/utils';
import { getLogger } from '@kreskolabs/lib/meta';
import type { BytesLike, ContractTransaction, Overrides } from 'ethers';
import type { DeployOptions, Deployment, Receipt } from 'hardhat-deploy/types';

export type DeployExtendedFunction = <T extends keyof TC>(
  type: T,
  options?: Omit<DeployOptions, 'from'> & {
    deploymentName?: string;
    from?: string;
  },
) => Promise<DeployResultWithSignatures<TC[T]>>;

export type CreateOpts = 'create2' | 'create3' | undefined;

export interface DeterministicOpts {
  type: 'create2' | 'create3';
  salt: BytesLike;
}

export interface DeterministicProxy {
  proxyAddress: string;
  implementationAddress: string;
}

type ProxyOpts<
  Logic extends keyof TC,
  InitFunc extends FuncNames<Logic>,
  CreateType extends CreateOpts,
> = BaseProxyOpts<Logic, InitFunc, CreateType> & ProxyExtendedOpts<Logic, InitFunc, CreateType>;

export type DeployProxyFunction = <
  Logic extends keyof TC,
  InitFunc extends FuncNames<Logic>,
  CreateType extends CreateOpts,
>(
  name: Logic,
  options: ProxyOpts<Logic, InitFunc, CreateType>,
) => Promise<TC[Logic]>;

export type DeployProxyBatchFunction = <
  List extends readonly [...any],
  Returns extends {
    [K in keyof List]: List[K] extends { name: keyof TC } ? readonly [TC[List[K]['name']], Deployment] : never;
  } = {
    [K in keyof List]: List[K] extends { name: keyof TC } ? readonly [TC[List[K]['name']], Deployment] : never;
  },
>(
  preparedData: List extends readonly [...infer REST]
    ? REST[number] extends ReturnType<typeof hre.prepareProxy>
      ? REST
      : List
    : never,
  options?: {
    from?: string;
    log?: boolean;
    getBalance?: boolean;
    getGasPrice?: boolean;
  },
) => Promise<Returns>;

export type PrepareProxyFunction = <
  Logic extends keyof TC,
  InitFunc extends FuncNames<Logic>,
  CreateType extends CreateOpts,
>(
  name: Logic,
  options: ProxyOpts<Logic, InitFunc, CreateType>,
) => Promise<PreparedProxy<Logic, InitFunc, CreateType>>;
export type PreparedProxy<Logic extends keyof TC, InitFunc extends FuncNames<Logic>, CreateType extends CreateOpts> = {
  name: Logic;
  create: (overrides?: Overrides) => Promise<ContractTransaction>;
  estimateGas: (overrides?: Overrides) => Promise<BigNumber>;
  deploymentId: string;
  calldata: string;
  initializerCalldata: string;
  deployedImplementationBytecode: BytesLike;
  factory: { abi: any[]; bytecode: string };
  saltBytes32?: BytesLike;
  args: ProxyOpts<Logic, InitFunc, CreateType>;
} & If<CreateType, DeterministicProxy>;

interface BaseProxyOpts<Logic extends keyof TC, InitFunc extends FuncNames<Logic>, CreateType extends CreateOpts> {
  deploymentName?: string;
  constructorArgs?: any[];
  from?: string;
  log?: boolean;
  type?: CreateType;
  initializer?: InitFunc;
  __types?: readonly [Logic, InitFunc, CreateType];
}

type ProxyExtendedOpts<Logic extends keyof TC, InitFunc extends FuncNames<Logic>, CreateType extends CreateOpts> = If<
  CreateType,
  DeterministicOpts,
  { salt?: never }
> &
  If<
    InitFunc,
    InitArgs<Logic, InitFunc> extends never
      ? { initializerArgs?: never }
      : { initializerArgs: InitArgs<Logic, InitFunc> },
    { initializerArgs?: never }
  >;

export type SaveProxyDeploymentFunction<
  Logic extends keyof TC,
  InitFunc extends FuncNames<Logic>,
  CreateType extends CreateOpts,
> = (
  receipt: Receipt,
  prepared: PreparedProxy<Logic, InitFunc, CreateType>,
  proxy: { proxy: string; Logicementation: string },
  context?: { logger: ReturnType<typeof getLogger>; log?: boolean },
  abi?: any[],
) => Promise<Deployment>;

type InitArgs<Logic extends keyof TC, InitFunc extends FuncNames<Logic>> = InitFunc extends FuncNames<Logic>
  ? FuncArgs<InitFunc, Logic>
  : never;

// interface BaseProxy extends BaseProxyArgs {}

export type If<Value extends any, YesResult extends any, NoResult extends any = {}> = IsUndefined<Value> extends false
  ? YesResult
  : NoResult;
export type GetContractOrNullFunction = <T extends keyof TC>(type: T, deploymentName?: string) => Promise<TC[T] | null>;
export type GetContractOrForkFunction = <T extends keyof TC>(type: T, deploymentName?: string) => Promise<TC[T]>;
export type GetDeploymentOrForkFunction = (deploymentName: string) => Promise<Deployment | null>;

// type ProxyArgHandler<
//   Logic extends keyof TC,
//   InitFunc extends FuncNames<Logic> | undefined,
//   CreateType extends CreateOpts | undefined = undefined,
// > = BaseProxyArgs<Logic, InitFunc, CreateType> &
//   If<CreateType, Deterministic> &
//   If<
//     InitArgs<Logic, InitFunc>,
//     { initializerArgs: IsUndefined<InitFunc> extends false ? 'not-undefined' : 'is-undefined' },
//     { initializerArgs?: never }
//   >;

// export type MaybeFuncArgs<Contract extends keyof TC, FunctionName extends undefined | FuncNames<Contract>> = If<
//   FunctionName,
//   { initializerArgs: FuncArgs<FunctionName, Contract> }
// >;

// type Data<T> = readonly [...T[]];
// export type DeployProxyBatchFunction = <
//   Logic extends keyof TC,
//   InitFunc extends FuncNames<Logic>,
//   CreateType extends CreateOpts,
// >(
//   preparedData: PreparedProxy<Logic, InitFunc, CreateType>[],
//   options?: {
//     from?: string;
//     log?: boolean;
//     getBalance?: boolean;
//     getGasPrice?: boolean;
//   },
// ) => Promise<(readonly [TC[Logic], Deployment])[]>;

// export type ProxyArgs<
//   Logic extends keyof TC,
//   InitFunc extends FuncNames<Logic>,
//   DeterministicType extends CreateOpts,
// > = {
//   deploymentName?: string;
//   constructorArgs?: any[];
//   initializer?: InitFunc;
//   type?: DeterministicType;
//   from?: string;
//   log?: boolean;
// } & MaybeFuncArgs<Logic, InitFunc> &
//   If<DeterministicType, { salt: string }, { salt: undefined }>;

// export type ProxyArgsWithInitializer<
//   Logic extends keyof TC,
//   InitFunc extends FuncNames<Logic>,
//   DeterministicType extends CreateOpts,
// > = {
//   deploymentName?: string;
//   constructorArgs?: any[];
//   initializer: InitFunc;
//   type?: DeterministicType;
//   from?: string;
//   log?: boolean;
// } & MaybeFuncArgs<Logic, InitFunc> &
//   If<DeterministicType, { salt: string }, { salt: undefined }>;

// export type ProxyArgs<
//   Logic extends keyof TC,
//   InitFunc extends FuncNames<Logic>,
//   CreateType extends CreateOpts,
// > = BaseProxyArgs<Logic, InitFunc, CreateType>;

// type InferContractType<T> = T extends ProxyArgHandler<infer Logic, infer InitFunc, infer CreateType>
//   ? [Logic, InitFunc, CreateType]
//   : never;
// type InferArrayContractTypes<T> = T extends readonly [infer ITEM, ...infer REST]
//   ? ITEM extends ProxyArgHandler<infer C, any, any>
//     ? ITEM extends ProxyArgHandler<C, infer B, any>
//       ? [C, B, ITEM, REST]
//       : C
//     : never
//   : false;
// export type ProxyArgs<
//   Logic extends keyof TC,
//   InitFunc extends FuncNames<Logic>,
//   DeterministicType extends CreateOpts,
// > = {
//   deploymentName?: string;
//   constructorArgs?: any[];
//   initializer?: InitFunc;
//   type?: DeterministicType;
//   from?: string;
//   log?: boolean;
// } & MaybeFuncArgs<Logic, InitFunc> &
//   If<DeterministicType, { salt: string }, { salt: undefined }>;
