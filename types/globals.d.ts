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
import {
    getBalanceCollateralFunc,
    getBalanceKrAssetFunc,
    setBalanceCollateralFunc,
    setBalanceKrAssetFunc,
} from "@utils/test/helpers/smock";
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
        contract: MockContract<Contracts.KreskoAsset>;
        deployArgs?: TestKreskoAssetArgs;
        kresko: () => Promise<KrAssetStructOutput>;
        anchor: MockContract<Contracts.KreskoAssetAnchor>;
        priceFeed: FakeContract<MockOracle>;
        setBalance: ReturnType<typeof setBalanceKrAssetFunc>;
        balanceOf: ReturnType<typeof getBalanceKrAssetFunc>;
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
        contract: MockContract<ERC20Upgradeable>;
        kresko: () => Promise<CollateralAssetStruct>;
        priceFeed: FakeContract<MockOracle>;
        setPrice: (price: number) => void;
        setOracleOrder: (order: [OracleType, OracleType]) => Promise<any>;
        setBalance: ReturnType<typeof setBalanceCollateralFunc>;
        balanceOf: ReturnType<typeof getBalanceCollateralFunc>;
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
