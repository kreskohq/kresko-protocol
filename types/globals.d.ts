import { FakeContract, MockContract } from "@defi-wonderland/smock";
import {
    TestCollateralAssetArgs,
    TestCollateralAssetUpdate,
    TestKreskoAssetArgs,
    TestKreskoAssetUpdate,
} from "@utils/test";
import type { BytesLike } from "ethers";
import { DeployResult } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ContractTypes } from "types";
import type * as Contracts from "./typechain";
import { OracleType } from "@utils/test/oracles";
import {
    KrAssetStructOutput,
    CollateralAssetStruct,
} from "./typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { MockOracle } from "./typechain";
declare global {
    const hre: HardhatRuntimeEnvironment;
    /* -------------------------------------------------------------------------- */
    /*                              Minter Contracts                              */
    /* -------------------------------------------------------------------------- */
    export type TC = ContractTypes;

    type TestKrAsset = {
        krAsset?: boolean;
        collateral?: boolean;
        address: string;
        contract: Contracts.KreskoAsset;
        deployArgs?: TestKreskoAssetArgs;
        kresko: () => Promise<KrAssetStructOutput>;
        mocks: {
            contract: MockContract<Contracts.KreskoAsset>;
            mockFeed: MockContract<Contracts.MockOracle>;
            fakeFeed: FakeContract<Contracts.MockOracle>;
            anchor?: MockContract<Contracts.KreskoAssetAnchor>;
        };
        anchor: Contracts.KreskoAssetAnchor;
        priceFeed: MockContract<MockOracle> | FakeContract<MockOracle>;
        setBalance: (user: SignerWithAddress, balance: BigNumber) => Promise<true>;
        setPrice: (price: number) => void;
        setOracleOrder: (order: [OracleType, OracleType]) => void;
        getPrice: () => Promise<BigNumber>;
        update: (update: TestKreskoAssetUpdate) => Promise<TestKrAsset>;
    };
    type TestCollateral = {
        address: string;
        collateral?: boolean;
        krAsset?: boolean;
        deployArgs: TestCollateralAssetArgs;
        contract: ERC20Upgradeable;
        kresko: () => Promise<CollateralAssetStruct>;
        mocks?: {
            contract: MockContract<KreskoAsset | Contracts.ERC20Upgradeable>;
            mockFeed: MockContract<Contracts.MockOracle>;
            fakeFeed: FakeContract<Contracts.MockOracle>;
            anchor?: MockContract<Contracts.KreskoAssetAnchor>;
        };
        priceFeed: MockContract<MockOracle> | FakeContract<MockOracle>;
        anchor: Contracts.KreskoAssetAnchor;
        setPrice: (price: number) => void;
        setOracleOrder: (order: [OracleType, OracleType]) => Promise<any>;
        setBalance: (user: SignerWithAddress, amount: BigNumber) => Promise<true>;
        getPrice: () => Promise<BigNumber>;
        update: (update: TestCollateralAssetUpdate) => Promise<TestCollateral>;
    };

    type TestKrAssets = TestKrAsset[];
    type TestCollaterals = TestCollateral[];

    type TestAsset = TestCollateral | TestKrAsset;
    /* -------------------------------------------------------------------------- */
    /*                                   Oracles                                  */
    /* -------------------------------------------------------------------------- */
    // type UniV2Router = Contracts.UniswapV2Router02;
    // type UniV2Factory = Contracts.UniswapV2Factory;
    /* -------------------------------------------------------------------------- */
    /*                               Misc Contracts                               */
    /* -------------------------------------------------------------------------- */

    type Contract = import("ethers").Contract;
    type GnosisSafeL2 = any;

    type KreskoAsset = TC["KreskoAsset"];
    type KrStaking = any;
    type ERC20Upgradeable = TC["ERC20Upgradeable"];
    type IERC20 = TC["IERC20Permit"];
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

    // type DeployResultWithSignaturesUnknown<C extends Contract> = readonly [C, string[], DeployResult];
    type DeployResultWithSignatures<T> = readonly [T, string[], DeployResult];

    type DiamondCutInitializer = [string, BytesLike];

    interface KreskoConstructor {
        admin?: string;
        council?: string;
        treasury?: string;
        extOracleDecimals: number;
        minCollateralRatio: number;
        minDebtValue: number;
        liquidationThreshold: number;
        oracleDeviationPct: number;

        sequencerUptimeFeed: string;
        sequencerGracePeriodTime: BigNumberish;
        oracleTimeout: BigNumberish;
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
}
