import { MAX_UINT_AMOUNT, toBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { wrapKresko } from "@utils/redstone";
import {
    Kresko,
    SCDPCollateralStruct,
    SCDPKrAssetStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import {
    InputArgsSimple,
    TestKreskoAssetArgs,
    defaultCloseFee,
    defaultCollateralArgs,
    defaultKrAssetArgs,
    defaultOpenFee,
} from "./mocks";
import Role from "./roles";
import { depositCollateral } from "./helpers/collaterals";
import { mintKrAsset } from "./helpers/krassets";
import { leverageKrAsset } from "./helpers/general";

type SCDPFixtureParams = {
    krAssets: () => Promise<TestKrAsset>[];
    collaterals: () => Promise<TestCollateral>[];
    defaultKrAssetConfig: SCDPKrAssetStruct;
    defaultCollateralConfig: SCDPCollateralStruct;
    swapKrAssetConfig: SCDPKrAssetStruct;
    swapKISSConfig: SCDPKrAssetStruct;
};

type SCDPFixtureReturn = {
    krAssets: TestKrAsset[];
    collaterals: TestCollateral[];
    users: SignerWithAddress[];
};

export const scdpFixture = hre.deployments.createFixture<SCDPFixtureReturn, SCDPFixtureParams>(async (hre, params) => {
    const result = await hre.deployments.fixture("scdp");

    if (result.Diamond) {
        hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
    }

    const [krAssets, collaterals] = await Promise.all([
        Promise.all(params!.krAssets()),
        Promise.all(params!.collaterals()),
    ]);

    const [KreskoAsset, KreskoAsset2, KISS] = krAssets;
    const [CollateralAsset, CollateralAsset8Dec] = collaterals;

    const users = [hre.users.testUserFive, hre.users.testUserSix, hre.users.testUserSeven];

    await time.increase(3602);
    await hre.Diamond.setFeeAssetSCDP(krAssets[2].address);
    for (const user of users) {
        await Promise.all([
            ...krAssets.map(async asset => asset.contract.connect(user).approve(hre.Diamond.address, MAX_UINT_AMOUNT)),
            ...collaterals.map(async asset =>
                asset.contract.connect(user).approve(hre.Diamond.address, MAX_UINT_AMOUNT),
            ),
        ]);
    }

    await Promise.all([
        await hre.Diamond.addDepositAssetsSCDP(
            [CollateralAsset.address, CollateralAsset8Dec.address],
            [params!.defaultCollateralConfig, params!.defaultCollateralConfig],
        ),
        hre.Diamond.addKrAssetsSCDP(
            [KreskoAsset.address, KreskoAsset2.address, KISS.address],
            [params!.swapKrAssetConfig, params!.swapKrAssetConfig, params!.swapKISSConfig],
        ),

        hre.Diamond.setSwapPairs([
            {
                assetIn: KreskoAsset2.address,
                assetOut: KreskoAsset.address,
                enabled: true,
            },
            {
                assetIn: KISS.address,
                assetOut: KreskoAsset2.address,
                enabled: true,
            },
            {
                assetIn: KreskoAsset.address,
                assetOut: KISS.address,
                enabled: true,
            },
        ]),
    ]);

    return {
        collaterals,
        krAssets,
        users,
    };
});

export const withFixture = (fixtureName: string[]) => {
    beforeEach(async function () {
        const result = await hre.deployments.fixture(fixtureName);
        if (result.Diamond) {
            hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
        }
        await time.increase(3602);
        this.facets = result.Diamond?.facets?.length ? result.Diamond.facets : [];
        this.collaterals = hre.collaterals;
        this.krAssets = hre.krAssets;
    });
};

export type DepositWithdrawFixtureParams = {
    Collateral: TestCollateral;
    KrAsset: TestKrAsset;
    Collateral2: TestCollateral;
    KrAssetCollateral: TestKrAsset;
    users: [SignerWithAddress, Kresko][];
    collaterals: TestCollateral[];
    krAssets: TestKrAsset[];
    initialDeposits: BigNumber;
};

export const depositWithdrawFixture = hre.deployments.createFixture<DepositWithdrawFixtureParams, {}>(async hre => {
    const result = await hre.deployments.fixture("minter-init");
    if (result.Diamond) {
        hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
    }
    await time.increase(3602);

    const withdrawer = hre.users.userFive;

    const DefaultCollateral = hre.collaterals!.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;

    const DefaultKrAsset = hre.krAssets!.find(k => k.deployArgs!.name === defaultKrAssetArgs.name)!;
    const KrAssetCollateral = hre.krAssets!.find(k => k.deployArgs!.name === "MockKreskoAssetCollateral")!;

    const depositArgs: InputArgsSimple = {
        user: hre.users.userOne,
        asset: DefaultCollateral,
        amount: toBig(10000),
    };
    const initialDeposits = toBig(10000);
    await DefaultCollateral.setBalance(withdrawer, initialDeposits, hre.Diamond.address);
    await wrapKresko(hre.Diamond, withdrawer).depositCollateral(
        withdrawer.address,
        DefaultCollateral.address,
        initialDeposits,
    );

    await KrAssetCollateral.contract.setVariable("_allowances", {
        [withdrawer.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
        },
    });

    return {
        collaterals: hre.collaterals,
        krAssets: hre.krAssets,
        initialDeposits,
        users: [
            [hre.users.userThree, wrapKresko(hre.Diamond, hre.users.userThree)],
            [hre.users.userOne, wrapKresko(hre.Diamond, hre.users.userOne)],
            [withdrawer, wrapKresko(hre.Diamond, withdrawer)],
        ],
        DepositorKresko: wrapKresko(hre.Diamond, depositArgs.user),
        Collateral: hre.collaterals!.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!,
        KrAsset: DefaultKrAsset,
        Collateral2: hre.collaterals!.find(c => c.deployArgs!.name === "MockCollateral2")!,
        KrAssetCollateral,
    };
});

export type LiquidationFixtureParams = {
    Collateral: TestCollateral;
    userOneMaxLiqPrecalc: BigNumber;
    Collateral2: TestCollateral;
    Collateral8Dec: TestCollateral;
    KrAsset: TestKrAsset;
    KrAsset2: TestKrAsset;
    KrAssetCollateral: TestKrAsset;
    users: [SignerWithAddress, Kresko][];
    collaterals: TestCollateral[];
    krAssets: TestKrAsset[];
    initialMintAmount: BigNumber;
    initialDeposits: BigNumber;
    reset: () => Promise<void>;
    resetRebasing: () => Promise<void>;
    krAssetArgs: {
        price: number;
        factor: number;
        supplyLimit: number;
        closeFee: number;
        openFee: number;
    };
};

// Set up mock KreskoAsset

export const liquidationsFixture = hre.deployments.createFixture<LiquidationFixtureParams, {}>(async hre => {
    const result = await hre.deployments.fixture("minter-init");
    if (result.Diamond) {
        hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
    }
    await time.increase(3602);

    const KrAssetCollateral = hre.krAssets!.find(k => k.deployArgs!.name === "MockKreskoAssetCollateral")!;
    const DefaultCollateral = hre.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;

    const Collateral2 = hre.collaterals.find(c => c.deployArgs!.name === "MockCollateral2")!;

    const Collateral8Dec = hre.collaterals.find(c => c.deployArgs!.name === "MockCollateral8Dec")!;

    const KreskoAsset2 = hre.krAssets.find(c => c.deployArgs!.name === "MockKreskoAsset2")!;

    const DefaultKrAsset = hre.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;

    await DefaultKrAsset.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);

    const initialDeposits = toBig(16.5);
    await DefaultCollateral.setBalance(hre.users.liquidator, toBig(100000000), hre.Diamond.address);
    await DefaultCollateral.setBalance(hre.users.userOne, initialDeposits, hre.Diamond.address);

    await depositCollateral({
        user: hre.users.userOne,
        amount: initialDeposits,
        asset: DefaultCollateral,
    });
    await depositCollateral({
        user: hre.users.liquidator,
        amount: toBig(100000000),
        asset: DefaultCollateral,
    });

    const initialMintAmount = toBig(10); // 10 * $11 = $110 in debt value
    await mintKrAsset({
        user: hre.users.userOne,
        amount: initialMintAmount,
        asset: DefaultKrAsset,
    });
    await mintKrAsset({
        user: hre.users.liquidator,
        amount: initialMintAmount.mul(1000),
        asset: DefaultKrAsset,
    });
    DefaultKrAsset.setPrice(11);
    DefaultCollateral.setPrice(7.5);
    const userOneMaxLiqPrecalc = await hre.Diamond.getMaxLiquidation(
        hre.users.userOne.address,
        DefaultKrAsset.address,
        DefaultCollateral.address,
    );

    DefaultCollateral.setPrice(10);

    const reset = async () => {
        DefaultKrAsset.setPrice(11);
        KreskoAsset2.setPrice(10);
        DefaultCollateral.setPrice(defaultCollateralArgs.price);
        Collateral2.setPrice(10);
        Collateral8Dec.setPrice(10);
    };

    /* -------------------------------------------------------------------------- */
    /*                               Rebasing setup                               */
    /* -------------------------------------------------------------------------- */

    const collateralPriceRebasing = 10;
    const krAssetPriceRebasing = 1;
    const thousand = toBig(1000); // $10k
    const rebasingAmounts = {
        liquidatorDeposits: thousand,
        userDeposits: thousand,
    };
    // liquidator
    await DefaultCollateral.setBalance(hre.users.testUserSix, rebasingAmounts.liquidatorDeposits, hre.Diamond.address);
    await depositCollateral({
        user: hre.users.testUserSix,
        asset: DefaultCollateral,
        amount: rebasingAmounts.liquidatorDeposits,
    });

    // another user
    await DefaultCollateral.setBalance(hre.users.userFour, rebasingAmounts.liquidatorDeposits, hre.Diamond.address);
    await depositCollateral({
        user: hre.users.userFour,
        asset: DefaultCollateral,
        amount: rebasingAmounts.liquidatorDeposits,
    });
    DefaultKrAsset.setPrice(krAssetPriceRebasing);
    await mintKrAsset({
        user: hre.users.userFour,
        asset: DefaultKrAsset,
        amount: toBig(6666.66666),
    });
    // another user
    await DefaultCollateral.setBalance(
        hre.users.testUserEight,
        rebasingAmounts.liquidatorDeposits,
        hre.Diamond.address,
    );
    await depositCollateral({
        user: hre.users.testUserEight,
        asset: DefaultCollateral,
        amount: rebasingAmounts.liquidatorDeposits,
    });
    DefaultKrAsset.setPrice(krAssetPriceRebasing);
    await mintKrAsset({
        user: hre.users.testUserEight,
        asset: DefaultKrAsset,
        amount: toBig(6666.66666),
    });
    DefaultKrAsset.setPrice(11);
    // another user
    await leverageKrAsset(hre.users.userThree, KrAssetCollateral, DefaultCollateral, rebasingAmounts.userDeposits);
    await leverageKrAsset(hre.users.userThree, KrAssetCollateral, DefaultCollateral, rebasingAmounts.userDeposits);
    const resetRebasing = async () => {
        DefaultCollateral.setPrice(collateralPriceRebasing);
        DefaultKrAsset.setPrice(krAssetPriceRebasing);
    };

    /* --------------------------------- Values --------------------------------- */
    return {
        resetRebasing,
        reset,
        userOneMaxLiqPrecalc,
        collaterals: hre.collaterals,
        krAssets: hre.krAssets,
        initialDeposits,
        initialMintAmount,
        users: [
            [hre.users.userOne, wrapKresko(hre.Diamond, hre.users.userOne)], // base
            [hre.users.userTwo, wrapKresko(hre.Diamond, hre.users.userTwo)], // nothing
            [hre.users.userThree, wrapKresko(hre.Diamond, hre.users.userThree)], // yolo
            [hre.users.userFour, wrapKresko(hre.Diamond, hre.users.userFour)], // healthy
            [hre.users.testUserEight, wrapKresko(hre.Diamond, hre.users.testUserEight)], // healthy
            [hre.users.liquidator, wrapKresko(hre.Diamond, hre.users.liquidator)], // liq
            [hre.users.userFive, wrapKresko(hre.Diamond, hre.users.userFive)], // liq two
            [hre.users.testUserSix, wrapKresko(hre.Diamond, hre.users.testUserSix)], // liq three
        ],
        Collateral: DefaultCollateral,
        KrAsset: DefaultKrAsset,
        Collateral2,
        Collateral8Dec,
        KrAsset2: KreskoAsset2,
        KrAssetCollateral,
        krAssetArgs: {
            price: 11, // $11
            factor: 1,
            supplyLimit: 100000000,
            closeFee: defaultCloseFee,
            openFee: defaultOpenFee,
        },
    };
});
