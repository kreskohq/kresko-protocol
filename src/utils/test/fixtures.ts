import { Facet } from "@kreskolabs/hardhat-deploy/dist/types";
import { deployments } from "hardhat";
import { addMockCollateralAsset, addMockKreskoAsset } from "./general";

type FixtureName = "createBaseDiamond" | "createMinter" | "createMinterUser" | "kreskoAsset";

export const withFixture = (fixtureName: FixtureName) => {
    beforeEach(async function () {
        const fixture = await fixtures[fixtureName]();
        this.facets = fixture.facets;
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};

type Fixture = {
    [name in FixtureName]: (options?: unknown) => Promise<{
        facets: Facet[];
        collaterals?: MockCollaterals;
        krAssets?: MockKrAssets;
    }>;
};

const fixtures: Fixture = {
    createBaseDiamond: deployments.createFixture(async hre => {
        await deployments.fixture(["diamond-init"]);

        const DiamondDeployment = await hre.deployments.get("Diamond");
        return {
            facets: DiamondDeployment.facets,
        };
    }),
    createMinter: deployments.createFixture(async hre => {
        await deployments.fixture(["diamond-init", "minter-init"]);

        const DiamondDeployment = await hre.deployments.get("Diamond");
        return {
            DiamondDeployment,
            facets: DiamondDeployment.facets,
        };
    }),
    createMinterUser: deployments.createFixture(async hre => {
        await deployments.fixture(["minter-init", "init-krassets"]);

        const DiamondDeployment = await hre.deployments.get("Diamond");

        const collateralAndOracle = await addMockCollateralAsset();
        const krAssetAndOracle = await addMockKreskoAsset();

        return {
            facets: DiamondDeployment.facets,
            collaterals: [collateralAndOracle],
            krAssets: [krAssetAndOracle],
        };
    }),
    kreskoAsset: deployments.createFixture(async hre => {
        await deployments.fixture("minter");
        const DiamondDeployment = await hre.deployments.get("Diamond");
        return {
            facets: DiamondDeployment.facets,
            collaterals: hre.collaterals,
            krAssets: hre.krAssets,
        };
    }),
};
