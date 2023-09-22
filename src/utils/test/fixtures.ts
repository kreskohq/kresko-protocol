import { MAX_UINT_AMOUNT, RAY, toBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { wrapKresko } from "@utils/redstone";
import { Facet } from "hardhat-deploy/types";
import {
    SCDPCollateralStruct,
    SCDPKrAssetStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

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
        await time.increase(3602);
        if (result.Diamond) {
            hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
        }
        this.facets = result.Diamond?.facets?.length ? result.Diamond.facets : [];
        this.collaterals = hre.collaterals;
        this.krAssets = hre.krAssets;
    });
};
