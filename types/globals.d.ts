import { DeployResult } from "@kreskolabs/hardhat-deploy/types";
import type { BytesLike } from "ethers";
import { FakeContract, MockContract } from "@defi-wonderland/smock";
import { ERC20Upgradeable__factory } from "./typechain/factories/src/contracts/shared";
import { KreskoAsset__factory, KreskoAssetAnchor__factory } from "./typechain/factories/src/contracts/kreskoasset";
import { KrAssetStructOutput } from "./Kresko";
import {KreskoAssetAnchor} from "types/typechain/src/contracts/kreskoasset"
import { CollateralAssetStruct } from "./typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import {
    TestKreskoAssetUpdate,
    TestKreskoAssetArgs,
    TestCollateralAssetArgs,
    TestCollateralAssetUpdate,
} from "@utils/test";

declare global {
    /* -------------------------------------------------------------------------- */
    /*                              Minter Contracts                              */
    /* -------------------------------------------------------------------------- */
    type Kresko = import("types/typechain").Kresko;
    type KreskoAsset = import("types/typechain").KreskoAsset;
    type KrAsset = {
        krAsset?: boolean;
        collateral?: boolean;
        address: string;
        contract: KreskoAsset;
        deployArgs: TestKreskoAssetArgs;
        kresko: () => Promise<KrAssetStructOutput>;
        mocks?: {
            contract: MockContract<KreskoAsset>;
            priceAggregator: MockContract<FluxPriceAggregator>;
            priceFeed: FakeContract<FluxPriceFeed>;
            anchor?: MockContract<KreskoAssetAnchor>;
        };
        anchor?: KreskoAssetAnchor;
        priceAggregator: FluxPriceAggregator;
        priceFeed: FluxPriceFeed;
        setPrice?: (price: number) => void;
        getPrice?: () => Promise<BigNumber>;
        update?: (update: TestKreskoAssetUpdate) => Promise<KrAsset>;
    };
    type Collateral = {
        address: string;
        collateral?: boolean;
        krAsset?: boolean;
        deployArgs: TestCollateralAssetArgs;
        contract: ERC20Upgradeable;
        kresko: () => Promise<CollateralAssetStruct>;
        mocks?: {
            contract: MockContract<ERC20Upgradeable>;
            priceAggregator: MockContract<FluxPriceAggregator>;
            priceFeed: FakeContract<FluxPriceFeed>;
            anchor?: MockContract<KreskoAssetAnchor>;
        };
        priceAggregator: FluxPriceAggregator;
        priceFeed: FluxPriceFeed;
        anchor?: KreskoAssetAnchor;
        setPrice?: (price: number) => void;
        getPrice?: () => Promise<BigNumber>;
        update?: (update: TestCollateralAssetUpdate) => Promise<CollateralAsset>;
    };

    type KrAssets = KrAsset[];
    type Collaterals = Collateral[];

    type Asset = Collateral | KrAsset;
    /* -------------------------------------------------------------------------- */
    /*                                   Oracles                                  */
    /* -------------------------------------------------------------------------- */
    type FluxPriceFeed = import("types/typechain").FluxPriceFeed;
    type FluxPriceAggregator = import("types/typechain").FluxPriceAggregator;
    type AggregatorV2V3Interface = import("types/typechain").AggregatorV2V3Interface;
    type FeedsRegistry = import("types/typechain").FeedsRegistry;

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
    type Users = {
        deployer: SignerWithAddress;
        owner: SignerWithAddress;
        admin: SignerWithAddress;
        operator: SignerWithAddress;
        userOne: SignerWithAddress;
        userTwo: SignerWithAddress;
        userThree: SignerWithAddress;
        userFour: SignerWithAddress;
        nonadmin?: SignerWithAddress;
        liquidator?: SignerWithAddress;
        feedValidator?: SignerWithAddress;
        treasury?: SignerWithAddress;
    };

    type Addresses = {
        ZERO: string;
        deployer: string;
        owner: string;
        admin: string;
        operator: string;
        userOne: string;
        userTwo: string;
        userThree: string;
        userFour: string;
        nonadmin?: string;
        liquidator?: string;
        feedValidator?: string;
        treasury?: string;
    };
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
        minimumLiquidationThreshold: BigNumberish;
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

export {}
