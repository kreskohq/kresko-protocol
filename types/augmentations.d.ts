import type { FakeContract } from "@defi-wonderland/smock";
import { Fragment, FunctionFragment, JsonFragment } from "@ethersproject/abi";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { checkAddress } from "@scripts/check-address";
import { providers } from "ethers";
import { hardhatUsers } from "hardhat-configs/users";
import { ABI, DeployOptions, Deployment, Facet } from "hardhat-deploy/dist/types";
import "hardhat/types/config";
import "mocha";
import type { UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from "types/typechain";
import * as Contracts from "./typechain";
/* ========================================================================== */
/*                             TEST AUGMENTATIONS                             */
/* ========================================================================== */

declare module "mocha" {
    export interface Context {
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
        usersArr: SignerWithAddress[];
        /* -------------------------------------------------------------------------- */
        /*                                   Diamond                                  */
        /* -------------------------------------------------------------------------- */
        facets: Facet[];
        Multisig: GnosisSafeL2;
        Diamond: TC["Kresko"];
        DiamondDeployment: Deployment;
        collaterals: TestCollateral[];
        collateral: TestCollateral;
        krAsset: TestKrAsset;
        krAssets: TestKrAsset[];
        /* -------------------------------------------------------------------------- */
        /*                              Misc / Deprecated                             */
        /* -------------------------------------------------------------------------- */
        treasury: string;
        // @todo DEPRECATING
        Oracles: FakeContract[];
        TKN1: Contracts.ERC20Upgradeable;
        TKN2: Contracts.ERC20Upgradeable;
        USDC: Contracts.ERC20Upgradeable;
        krTSLA: Contracts.KreskoAsset;
        Kresko: Contracts.Kresko;
        WETH10OraclePrice: number;
    }
}
export {};

/* ========================================================================== */
/*                         HARDHAT RUNTIME EXTENSIONS                         */
/* ========================================================================== */
declare module "hardhat/types/config" {
    // This is an example of an extension to one of the Hardhat config values.

    // We extend the UserConfig type, which represents the config as written
    // by the users. Things are normally optional here.
    export interface ProjectPathsUserConfig {
        exclude?: string[];
    }

    // We also extend the Config type, which represents the configuration
    // after it has been resolved. This is the type used during the execution
    // of tasks, tests and scripts.
    // Normally, you don't want things to be optional here. As you can apply
    // default values using the extendConfig function.
    export interface ProjectPathsConfig {
        exclude: string[];
    }
}

declare module "hardhat/types/runtime" {
    export type HardhatUsers<T> = {
        [key in keyof typeof hardhatUsers]: T;
    };

    interface HardhatRuntimeEnvironment {
        /* -------------------------------------------------------------------------- */
        /*                              Helper Functions                              */
        /* -------------------------------------------------------------------------- */

        checkAddress: typeof checkAddress;
        getDeploymentOrFork: (deploymentName: string) => Promise<Deployment | null>;
        getContractOrFork: <T extends keyof TC>(type: T, deploymentName?: string) => Promise<TC[T]>;
        forking: {
            provider: providers.JsonRpcProvider;
            deploy: <T extends keyof TC>(
                type: T,
                options?: Partial<DeployOptions & { deploymentName?: string }>,
            ) => Promise<TC[T]>;
        };
        deploy<T extends keyof TC>(
            type: T,
            options?: Omit<DeployOptions, "from"> & {
                deploymentName?: string;
                from?: string;
            },
        ): Promise<DeployResultWithSignatures<TC[T]>>;
        // deploy<C extends Contract>(id: string, options?: DeployOptions): Promise<DeployResultWithSignaturesUnknown<C>>;
        getSignature: (jsonItem: Fragment | JsonFragment | string) => string | false;
        getSignatures: (abi: ABI) => string[];
        getSignaturesWithNames: (abi: ABI) => { name: string; sig: string }[];
        bytesCall: <T>(func: FunctionFragment, params: T) => string;
        users: HardhatUsers<SignerWithAddress>;
        addr: HardhatUsers<string>;

        /* -------------------------------------------------------------------------- */
        /*                                 Deployment                                 */
        /* -------------------------------------------------------------------------- */

        krAssets: TestKrAsset[];
        collateral: TestCollateral;
        krAsset: TestKrAsset;
        collaterals: TestCollateral[];
        facets: { name: string; address: string; functions: number }[];

        /* -------------------------------------------------------------------------- */
        /*                             Misc / Deprecating                             */
        /* -------------------------------------------------------------------------- */

        allAssets: TestAsset[];
        uniPairs: {
            [name: string]: UniswapV2Pair;
        };
        DiamondDeployment: Deployment;
        Diamond: TC["Kresko"];
        Multisig: TC["GnosisSafeL2"];

        UniV2Factory: UniswapV2Factory;
        UniV2Router: UniswapV2Router02;
    }
}
