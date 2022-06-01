import { DeployResult } from "hardhat-deploy/types";

export {};

declare global {
    type Kresko = import("./contracts/Kresko").Kresko;
    type KreskoAsset = import("./contracts/KreskoAsset").KreskoAsset;
    type NonRebasingWrapperToken = import("./contracts/NonRebasingWrapperToken").NonRebasingWrapperToken;
    type RebasingToken = import("./contracts/RebasingToken").RebasingToken;

    type FluxPriceFeed = import("./contracts/FluxPriceFeed").FluxPriceFeed;
    type FluxPriceAggregator = import("./contracts/FluxPriceAggregator").FluxPriceAggregator;
    type AggregatorV2V3Interface = import("./contracts/AggregatorV2V3Interface").AggregatorV2V3Interface;
    type FeedsRegistry = import("./contracts/FeedsRegistry").FeedsRegistry;
    type WETH9 = import("./contracts/WETH9").WETH9;

    type MockToken = import("./contracts/MockToken").MockToken;
    type Token = import("./contracts/Token").Token;
    type IERC20 = import("./contracts/IERC20").IERC20;
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
        liquidationThreshold: BigNumberish;
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
