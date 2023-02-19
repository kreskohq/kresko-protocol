import { FakeContract, MockContract } from "@defi-wonderland/smock";
import { DeployResult } from "@kreskolabs/hardhat-deploy/types";
import {
  TestCollateralAssetArgs,
  TestCollateralAssetUpdate, TestKreskoAssetArgs, TestKreskoAssetUpdate
} from "@utils/test";
import type { BytesLike } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { KreskoAssetAnchor } from "types/typechain/src/contracts/kreskoasset";
import { CollateralAssetStruct, KrAssetStructOutput } from "./typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

declare global {
    const hre: HardhatRuntimeEnvironment;
    /* -------------------------------------------------------------------------- */
    /*                              Minter Contracts                              */
    /* -------------------------------------------------------------------------- */
    type Kresko = import("types/typechain").Kresko;
    type KreskoAsset = import("types/typechain").KreskoAsset;
    type TestKrAsset = {
        krAsset?: boolean;
        collateral?: boolean;
        address: string;
        contract: KreskoAsset;
        deployArgs: TestKreskoAssetArgs;
        kresko: () => Promise<KrAssetStructOutput>;
        mocks?: {
            contract: MockContract<KreskoAsset>;
            mockFeed: MockContract<FluxPriceFeed>;
            priceFeed: FakeContract<FluxPriceFeed>;
            anchor?: MockContract<KreskoAssetAnchor>;
        };
        anchor?: KreskoAssetAnchor;
        priceFeed: FluxPriceFeed;
        setBalance?: (user: SignerWithAddress, balance: BigNumber) =>Promise<void>
        setPrice?: (price: number) => void;
        getPrice?: () => Promise<BigNumber>;
        setMarketOpen?: (marketOpen: boolean) => void;
        getMarketOpen?: () => Promise<boolean>;
        update?: (update: TestKreskoAssetUpdate) => Promise<TestKrAsset>;
    };
    type TestCollateral = {
        address: string;
        collateral?: boolean;
        krAsset?: boolean;
        deployArgs: TestCollateralAssetArgs;
        contract: ERC20Upgradeable;
        kresko: () => Promise<CollateralAssetStruct>;
        mocks?: {
            contract: MockContract<ERC20Upgradeable>;
            priceFeed: FakeContract<FluxPriceFeed>;
            anchor?: MockContract<KreskoAssetAnchor>;
        };
        priceFeed: FluxPriceFeed;
        anchor?: KreskoAssetAnchor;
        setPrice?: (price: number) => void;
        setBalance?: (user: SignerWithAddress, amount: BigNumber) => Promise<void>;
        getPrice?: () => Promise<BigNumber>;
        update?: (update: TestCollateralAssetUpdate) => Promise<TestCollateral>;
    };

    type TestKrAssets = TestKrAsset[];
    type TestCollaterals = TestCollateral[];

    type TestAsset = TestCollateral | TestKrAsset;
    /* -------------------------------------------------------------------------- */
    /*                                   Oracles                                  */
    /* -------------------------------------------------------------------------- */
    type FluxPriceFeed = import("types/typechain").FluxPriceFeed;

    type FluxPriceFeedFactory = import("types/typechain").FluxPriceFeedFactory;
    type AggregatorV2V3Interface = import("types/typechain").AggregatorV2V3Interface;

    /* -------------------------------------------------------------------------- */
    /*                               Misc Contracts                               */
    /* -------------------------------------------------------------------------- */
    type Contract = import("ethers").Contract;

    type WETH9 = import("types/typechain").WETH9;
    type ERC20Upgradeable = import("types/typechain").ERC20Upgradeable;
    type IERC20 = import("types/typechain").IERC20;

    type BigNumberish = import("ethers").BigNumberish;
    type BigNumber = import("ethers").BigNumber;
    /* -------------------------------------------------------------------------- */
    /*                               Signers / Users                              */
    /* -------------------------------------------------------------------------- */
    type Signer = import("ethers").Signer;
    type SignerWithAddress = import("@nomiclabs/hardhat-ethers/signers").SignerWithAddress;


    /* -------------------------------------------------------------------------- */
    /*                                 Deployments                                */
    /* -------------------------------------------------------------------------- */
    type Artifact = import("hardhat/types").Artifact;

    type DeployResultWithSignatures<T extends Contract> = [T, string[], DeployResult];

    type DiamondCutInitializer = [string, BytesLike];

    interface KreskoConstructor {
        feeRecipient: string;
        liquidationIncentive: BigNumberish;
        minimumCollateralizationRatio: BigNumberish;
        minimumDebtValue: BigNumberish;
        liquidationThreshold: BigNumberish;
    }
    interface KreskoAssetInitializer {
        name: string;
        symbol: string;
        decimals: number;
        owner: string;
        kresko: string;
    }

    interface KreskoAssetAnchorInitializer {
        krAsset: string;
        name: string;
        symbol: string;
        owner: string;
    }
    interface Network {
        rpcUrl?: string;
        chainId?: number;
        tags: string[];
        gasPrice?: number | "auto" | undefined;
        live?: boolean;
        saveDeployments?: boolean;
    }

}

export { };

