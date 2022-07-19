import { DeployResult } from "hardhat-deploy/types";

export {};

declare global {
    type Kresko = import("./contracts/src/contracts/Kresko").Kresko;
    type KreskoAsset = import("./contracts/src/contracts/KreskoAsset").KreskoAsset;
    type NonRebasingWrapperToken = import("./contracts/index").NonRebasingWrapperToken;
    type RebasingToken = import("./contracts/index").RebasingToken;

    type FluxPriceFeed = import("./contracts/src/contracts/flux/FluxPriceFeed").FluxPriceFeed;
    type FluxPriceAggregator = import("./contracts/src/contracts/flux/FluxPriceAggregator").FluxPriceAggregator;
    type AggregatorV2V3Interface =
        import("./contracts/src/contracts/flux/interfaces/AggregatorV2V3Interface").AggregatorV2V3Interface;
    type FeedsRegistry = import("./contracts/src/contracts/flux/FeedsRegistry").FeedsRegistry;
    type WETH9 = import("./contracts/index").WETH9;

    type MockToken = import("./contracts/index").MockToken;
    type Token = import("./contracts/index").Token;
    type IERC20 = import("./contracts/index").IERC20;
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
        secondsUntilStalePrice: BigNumberish;
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
