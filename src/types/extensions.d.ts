import type {
  DeployExtendedFunction,
  DeployProxyBatchFunction,
  DeployProxyFunction,
  GetContractOrForkFunction,
  GetContractOrNullFunction,
  GetDeploymentOrForkFunction,
  PrepareProxyFunction,
} from '@/types/functions'
import { hardhatUsers } from '@config/hardhat'
import { proxyUtils } from '@config/hardhat/utils'
import { Fragment, type JsonFragment } from '@ethersproject/abi'
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import 'ethers'
import type { ABI, Deployment } from 'hardhat-deploy/dist/types'
import 'hardhat/types/config'
import 'mocha'
import type { KISS, MockERC20 } from './typechain'
import type { PythViewStruct } from './typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { Hex } from 'viem'

/* -------------------------------------------------------------------------- */
/*                               Hardhat Config                               */
/* -------------------------------------------------------------------------- */
declare module 'hardhat/types/config' {
  export interface ProjectPathsUserConfig {
    exclude?: string[]
  }
  export interface ProjectPathsConfig {
    exclude: string[]
  }
}

/* -------------------------------------------------------------------------- */
/*                      Hardhat Runtime (hre.{extension})                     */
/* -------------------------------------------------------------------------- */

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    /* -------------------------------- Functions ------------------------------- */
    getDeploymentOrFork: GetDeploymentOrForkFunction
    getContractOrFork: GetContractOrForkFunction
    getContractOrNull: GetContractOrNullFunction
    prepareProxy: PrepareProxyFunction
    deploy: DeployExtendedFunction
    deployProxy: DeployProxyFunction
    deployProxyBatch: DeployProxyBatchFunction
    saveProxy: (typeof proxyUtils)['save']
    getSignature: (jsonItem: Fragment | JsonFragment | string) => string | false
    getSignatures: (abi: ABI) => string[]
    getSignaturesWithNames: (abi: ABI) => { name: string; sig: string }[]
    /* ------------------------------- Convenience ------------------------------ */
    Diamond: TC['Kresko']
    facets: { name: string; address: string; functions: number }[]
    DeploymentFactory: TC['DeploymentFactory']
    KISS: TestAsset<KISS, any>
    krAssets: TestAsset<KreskoAsset, 'mock'>[]
    extAssets: TestAsset<MockERC20, 'mock'>[]
    updateData: () => Hex[]
    viewData: () => PythViewStruct

    users: HardhatUsers<SignerWithAddress>
    addr: HardhatUsers<string>
    /* ---------------------------------- Misc ---------------------------------- */
    DiamondDeployment: Deployment
    Multisig: any
    UniV2Factory: any
    UniV2Router: any
  }

  export type HardhatUsers<T> = {
    [key in keyof typeof hardhatUsers]: T
  }
}

/* -------------------------------------------------------------------------- */
/*                                    Mocha                                   */
/* -------------------------------------------------------------------------- */

declare module 'mocha' {
  export interface Context {
    krAssets: TestAsset<KreskoAsset, 'mock'>[]
    collaterals: TestAsset<MockERC20>[]
  }
}

/* -------------------------------------------------------------------------- */
/*                                  BigNumber                                 */
/* -------------------------------------------------------------------------- */

declare module 'ethers' {
  interface BigNumber {
    ray: () => BigNumber
    wad: () => BigNumber
    HALF_RAY: () => BigNumber
    HALF_WAD: () => BigNumber
    HALF_PERCENTAGE: () => BigNumber
    PERCENTAGE_FACTOR: () => BigNumber
    wadMul: (b: BigNumberish) => BigNumber
    wadDiv: (b: BigNumberish) => BigNumber
    rayMul: (b: BigNumberish) => BigNumber
    rayDiv: (b: BigNumberish) => BigNumber
    percentMul: (b: BigNumberish) => BigNumber
    percentDiv: (b: BigNumberish) => BigNumber
    rayToWad: () => BigNumber
    wadToRay: () => BigNumber
    negated: () => BigNumber
    num(decimals?: number): number
    str(decimals?: number): string
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Number                                   */
/* -------------------------------------------------------------------------- */

declare global {
  interface Number {
    ebn: (decimals?: number) => BigNumber

    RAY: BigNumber
    WAD: BigNumber
    HALF_RAY: BigNumber
    HALF_WAD: BigNumber
    HALF_PERCENTAGE: BigNumber
    PERCENTAGE_FACTOR: BigNumber
    erayMul: (b: BigNumberish) => BigNumber
    erayDiv: (b: BigNumberish) => BigNumber
    ewadMul: (b: BigNumberish) => BigNumber
    ewadDiv: (b: BigNumberish) => BigNumber
    epercentMul: (pct: BigNumberish) => BigNumber
    epercentDiv: (pct: BigNumberish) => BigNumber
    ewadToRay: (b: BigNumberish) => BigNumber
    erayToWad: (b: BigNumberish) => BigNumber
  }
}
export {}
