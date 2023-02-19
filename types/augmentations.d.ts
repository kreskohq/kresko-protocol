// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { HardhatRuntimeEnvironment } from "hardhat/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Context } from "mocha";
import { Fragment, FunctionFragment, JsonFragment } from "@ethersproject/abi";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { fromBig, toBig } from "@kreskolabs/lib";
import type { Fixture } from "ethereum-waffle";
import type { ABI, Deployment, DeployOptions, Facet, FacetCut } from "@kreskolabs/hardhat-deploy/dist/types";

import type {
  FluxPriceFeed,
  UniswapV2Pair,
  UniswapV2Factory,
  UniswapV2Router02,
  Kresko,
  ERC20Upgradeable,
  UniswapV2Oracle,
  IERC20Upgradeable,
} from "types/typechain";
import type { BytesLike, providers } from "ethers";
import type { GnosisSafeL2 } from "./typechain";
import type { FakeContract, MockContract } from "@defi-wonderland/smock";
import { hardhatUsers, users } from 'hardhat-configs/users';
import { ContractNames } from 'packages/contracts';

/* ========================================================================== */
/*                             TEST AUGMENTATIONS                             */
/* ========================================================================== */

declare module "mocha" {
  export interface Context {
    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    loadFixture: <T>( fixture: Fixture<T> ) => Promise<T>;
    calculateAmountB: (
      amountA: BigNumber,
      tokenA: string,
      tokenB: string,
      pair: UniswapV2Pair,
    ) => Promise<BigNumber>;
    getMostProfitableLiquidation: (
      userAddress: string,
    ) => Promise<{ maxUSD: number; collateralAsset: string; krAsset: string }>;
    getUserValues: () => Promise<
      {
        actualCollateralUSD: number;
        actualDebtUSD: number;
        isUserSolvent: boolean;
        collateralAmountVolative: number;
        collateralAmountStable: number;
        krAssetAmountVolative: number;
        krAssetAmountStable: number;
        debtUSDProtocol: number;
        collateralUSDProtocol: number;
        minCollateralUSD: number;
        isLiquidatable: boolean;
        userAddress: string;
      }[]
    >;
    isProtocolSolvent: () => Promise<boolean>;
    addCollateralAsset: ( marketPrice: number, factor?: number ) => Promise<MockContract<ERC20Upgradeable>>;
    addKrAsset: ( marketPrice: number ) => Promise<MockContract<KreskoAsset>>;

    /* -------------------------------------------------------------------------- */
    /*                               Users / Signers                              */
    /* -------------------------------------------------------------------------- */
    signers: {
      deployer: SignerWithAddress;
      owner: SignerWithAddress;
      admin: SignerWithAddress;
      operator?: SignerWithAddress;
      userOne: SignerWithAddress;
      userTwo: SignerWithAddress;
      userThree?: SignerWithAddress;
      nonadmin?: SignerWithAddress;
      liquidator?: SignerWithAddress;
      treasury?: SignerWithAddress;
    };
    users: {
      deployer: SignerWithAddress;
      owner: SignerWithAddress;
      admin: SignerWithAddress;
      operator: SignerWithAddress;
      userOne: SignerWithAddress;
      userTwo: SignerWithAddress;
      userThree: SignerWithAddress;
      nonadmin?: SignerWithAddress;
      liquidator?: SignerWithAddress;
      treasury?: SignerWithAddress;
    };
    /* -------------------------------------------------------------------------- */
    /*                                   Diamond                                  */
    /* -------------------------------------------------------------------------- */
    facets: Facet[];
    Multisig: GnosisSafeL2;
    Diamond: Kresko;
    DiamondDeployment: Deployment;
    collaterals?: TestCollateral[];
    collateral?: TestCollateral;
    krAsset?: TestKrAsset;
    krAssets?: TestKrAsset[];
    /* -------------------------------------------------------------------------- */
    /*                              Misc / Deprecated                             */
    /* -------------------------------------------------------------------------- */
    // @todo DEPRECATING
    UniV2Router: UniswapV2Router02;
    lpPair: UniswapV2Pair;
    treasury: string;
    pricefeed: FluxPriceFeed;
    // @todo DEPRECATING
    Oracles: FakeContract<FluxPriceFeed>[];
    TKN1: IERC20Upgradeable;
    TKN2: IERC20Upgradeable;
    USDC: IERC20Upgradeable;
    krTSLA: KreskoAsset;
    Kresko: Kresko;
    WETH10OraclePrice: number;
    WETH10Oracle: FluxPriceFeed;
  }
}
export { };

/* ========================================================================== */
/*                         HARDHAT RUNTIME EXTENSIONS                         */
/* ========================================================================== */

declare module "hardhat/types/runtime" {
  export type HardhatUsers<T> = {
    [ key in keyof typeof hardhatUsers ]: T;
  }
  export interface HardhatRuntimeEnvironment {
    /* -------------------------------------------------------------------------- */
    /*                              Helper Functions                              */
    /* -------------------------------------------------------------------------- */
    fromBig: typeof fromBig;
    toBig: typeof toBig;
    forking: {
      provider: providers.JsonRpcProvider;
      deploy: <T extends Contract>( name: string, options?: DeployOptions ) => Promise<T>;
    }
    getContractOrFork: <T extends Contract>(name: ContractNames) => Promise<T>;
    deploy: <T extends Contract>( name: string, options?: DeployOptions ) => Promise<DeployResultWithSignatures<T>>;
    getSignature: ( jsonItem: Fragment | JsonFragment | string ) => string | false;
    getSignatures: ( abi: ABI ) => string[];
    getSignaturesWithNames: ( abi: ABI ) => { name: string; sig: string }[];
    bytesCall: <T>( func: FunctionFragment, params: T ) => string;
    getAddFacetArgs: <T extends Contract>(
      facet: T,
      signatures?: string[],
      initializer?: {
        contract: Contract;
        functionName?: string;
        args?: [ string, BytesLike ];
      },
    ) => {
      facetCut: FacetCut;
      initialization: {
        _init: string;
        _calldata: BytesLike;
      };
    };
    users: HardhatUsers<SignerWithAddress>;
    addr: HardhatUsers<string>
    /* -------------------------------------------------------------------------- */
    /*                                   General                                  */
    /* -------------------------------------------------------------------------- */
    getUsers: () => Promise<HardhatUsers<SignerWithAddress>>;
    getAddresses: () => Promise<HardhatUsers<string>>;

    /* -------------------------------------------------------------------------- */
    /*                                 Deployment                                 */
    /* -------------------------------------------------------------------------- */
    DiamondDeployment: Deployment;
    Diamond: Kresko;
    Multisig: GnosisSafeL2;
    krAssets: TestKrAsset[];
    collateral: TestCollateral;
    krAsset: TestKrAsset;
    collaterals: TestCollateral[];
    allAssets: TestAsset[];
    facets: { name: string; address: string; functions: number }[]
    uniPairs: {
      [ name: string ]: UniswapV2Pair;
    };
    UniV2Oracle: UniswapV2Oracle;
    /* -------------------------------------------------------------------------- */
    /*                             Misc / Deprecating                             */
    /* -------------------------------------------------------------------------- */
    UniV2Factory: UniswapV2Factory;
    UniV2Router: UniswapV2Router02;
  }
}

export { };
