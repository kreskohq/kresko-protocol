import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Fixture } from "ethereum-waffle";

import { DeployResult, DeployOptions, ABI } from "hardhat-deploy/types";
import { FunctionFragment } from "ethers/lib/utils";
import { fromBig, toBig } from "@utils/numbers";

declare module "mocha" {
    export interface Context {
        loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
        UniFactory: UniswapV2Factory;
        UniRouter: UniswapV2Router02;
        signers: {
            admin: SignerWithAddress;
            operator?: SignerWithAddress;
            userOne: SignerWithAddress;
            userTwo: SignerWithAddress;
            nonadmin?: SignerWithAddress;
        };
        admin: string;
        userOne: string;
        userTwo: string;
        treasury: string;
        pricefeed: FluxPriceFeed;
        Zapper: KreskoZapperUniswap;
        Kresko: Kresko;
        TKN1: Token;
        TKN2: Token;
        lpPair: UniswapV2Pair;
        Staking: Staking;
    }
}
export {};

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        deploy: <T extends Contract>(name: string, options?: DeployOptions) => Promise<DeployResultWithSignatures<T>>;
        getSignatures: (abi: ABI) => string[];
        utils: typeof import("ethers/lib/utils");
        bytesCall: <T>(func: FunctionFragment, params: T) => string;
        fromBig: typeof fromBig;
        toBig: typeof toBig;
        kresko: Kresko;
        krAssets: {
            [name: string]: KreskoAsset;
        };
        priceFeeds: {
            [description: string]: FluxPriceFeed;
        };
        priceAggregators: {
            [description: string]: FluxPriceAggregator;
        };
        priceFeedsRegistry: FeedsRegistry;
        constructors: {
            [contractName in SupportedContracts]: (overrides?: Partial<SupportedConstructors>) => SupportedConstructors;
        };
    }
}

export {};
