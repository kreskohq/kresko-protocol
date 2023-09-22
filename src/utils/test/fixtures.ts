import { MAX_UINT_AMOUNT, RAY, toBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { wrapKresko } from "@utils/redstone";
import { Facet } from "hardhat-deploy/types";
import {
    SCDPCollateralStruct,
    SCDPKrAssetStruct,
} from "types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko";

type MinterFixtureParams = string[];
type MinterFixtureReturn = {
    facets: Facet[];
    collaterals: TestCollateral[];
    krAssets: TestKrAsset[];
};
const minterFixture = hre.deployments.createFixture<MinterFixtureReturn, MinterFixtureParams>(async (hre, params) => {
    const result = await hre.deployments.fixture(params);
    await time.increase(3602);
    if (result.Diamond) {
        hre.Diamond = wrapKresko(await hre.getContractOrFork("Kresko"));
    }
    return {
        facets: result.Diamond?.facets?.length ? result.Diamond.facets : [],
        collaterals: hre.collaterals,
        krAssets: hre.krAssets,
    };
});

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

    console.debug("SCDPFixture!");
    return {
        collaterals,
        krAssets,
        users,
    };
});

export const withFixture = (fixtureName: string[]) => {
    beforeEach(async function () {
        // const fixture = awaithre.deployments.fixture("scdp-init");
        const fixture = await minterFixture(fixtureName);
        this.facets = fixture.facets || [];
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};
