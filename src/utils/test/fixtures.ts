import { MAX_UINT_AMOUNT, RAY, toBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { wrapKresko } from "@utils/redstone";
import { Facet } from "hardhat-deploy/types";
import {
    Kresko,
    SCDPCollateralStruct,
    SCDPKrAssetStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";
import { InputArgsSimple, defaultCollateralArgs, defaultKrAssetArgs } from "./mocks";
import { read } from "./helpers/smock";

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
    await read();
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
        KrAssetCollateral: hre.krAssets!.find(k => k.deployArgs!.name === "MockKreskoAssetCollateral")!,
    };
});
