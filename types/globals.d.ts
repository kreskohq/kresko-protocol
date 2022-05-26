import { DeployResult } from "@kreskolabs/hardhat-deploy/types";

export {};

declare global {
    type Kresko = import(".").Kresko;
    type KreskoAsset = import(".").KreskoAsset;
    type NonRebasingWrapperToken = import(".").NonRebasingWrapperToken;
    type RebasingToken = import(".").RebasingToken;

    type FluxPriceFeed = import(".").FluxPriceFeed;
    type FluxPriceAggregator = import(".").FluxPriceAggregator;
    type AggregatorV2V3Interface = import(".").AggregatorV2V3Interface;
    type FeedsRegistry = import(".").FeedsRegistry;
    type WETH9 = import(".").WETH9;

    type MockToken = import(".").MockToken;
    type Token = import(".").Token;
    type IERC20 = import(".").IERC20;
    type Contract = import("ethers").Contract;
    type BigNumberish = import("ethers").BigNumberish;
    type BigNumber = import("ethers").BigNumber;

    type Signer = import("ethers").Signer;
    type SignerWithAddress = import("@nomiclabs/hardhat-ethers/signers").SignerWithAddress;

    type Artifact = import("hardhat/types").Artifact;

    type DeployResultWithSignatures<T extends Contract> = [T, string[], DeployResult];

    interface KreskoConstructor {
        burnFee: BigNumberish;
        feeRecipient: string;
        liquidationIncentive: BigNumberish;
        minimumCollateralizationRatio: BigNumberish;
        minimumDebtValue: BigNumberish;
        secondsUntilPriceStale: BigNumberish;
    }
    interface KreskoAssetConstructor {
        name: string;
        symbol: string;
        owner: string;
        operator: string;
    }

    type SupportedContracts = "Kresko";
    type SupportedConstructors = KreskoConstructor;
    interface Network {
        rpcUrl?: string;
        chainId?: number;
        tags: string[];
        gasPrice?: number | "auto" | undefined;
        live?: boolean;
        saveDeployments?: boolean;
    }
}
