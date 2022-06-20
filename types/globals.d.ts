import { DeployResult } from "@kreskolabs/hardhat-deploy/types";
import { BytesLike } from "ethers";

export {};

declare global {
    type Kresko = import("types/typechain").Kresko;
    type KreskoAsset = import("types/typechain").KreskoAsset;

    type FluxPriceFeed = import("types/typechain").FluxPriceFeed;
    type FluxPriceAggregator = import("types/typechain").FluxPriceAggregator;
    type AggregatorV2V3Interface = import("types/typechain").AggregatorV2V3Interface;
    type FeedsRegistry = import("types/typechain").FeedsRegistry;
    type WETH9 = import("types/typechain").WETH9;

    type IERC20 = import("types/typechain").IERC20;
    type Contract = import("ethers").Contract;
    type BigNumberish = import("ethers").BigNumberish;
    type BigNumber = import("ethers").BigNumber;

    type Signer = import("ethers").Signer;
    type SignerWithAddress = import("@nomiclabs/hardhat-ethers/signers").SignerWithAddress;
    type Users = {
        deployer: SignerWithAddress;
        owner: SignerWithAddress;
        operator: SignerWithAddress;
        userOne: SignerWithAddress;
        userTwo: SignerWithAddress;
        userThree: SignerWithAddress;
        nonadmin?: SignerWithAddress;
        liquidator?: SignerWithAddress;
        feedValidator?: SignerWithAddress;
        treasury?: SignerWithAddress;
    };

    type Artifact = import("hardhat/types").Artifact;

    type DeployResultWithSignatures<T extends Contract> = [T, string[], DeployResult];

    type DiamondCutInitializer = [string, BytesLike];

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
