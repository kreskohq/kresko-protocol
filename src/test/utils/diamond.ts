import { deployments, ethers } from "hardhat";
import { addMockCollateralAsset, addMockKreskoAsset, getUsers } from "./general";
import { constants } from "ethers";
import { Deployment, Facet } from "@kreskolabs/hardhat-deploy/dist/types";
import type { Kresko } from "types";

type FixtureName = "createBaseDiamond" | "createMinter" | "createMinterUser" | "kreskoAsset";

export const withFixture = (fixtureName: FixtureName) => {
    beforeEach(async function () {
        const fixture = await fixtures[fixtureName]();

        this.users = fixture.users;
        this.addresses = {
            ZERO: constants.AddressZero,
            deployer: await this.users.deployer.getAddress(),
            userOne: await this.users.userOne.getAddress(),
            nonAdmin: await this.users.nonadmin.getAddress(),
        };

        this.Diamond = fixture.Diamond;
        this.facets = fixture.facets;
        this.DiamondDeployment = fixture.DiamondDeployment;
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};

type Fixture = {
    [name in FixtureName]: (options?: unknown) => Promise<{
        DiamondDeployment: Deployment;
        Diamond: Kresko;
        facets: Facet[];
        users: Users;
        collaterals?: MockCollaterals;
        krAssets?: MockKrAssets;
    }>;
};

const fixtures: Fixture = {
    createBaseDiamond: deployments.createFixture(async _hre => {
        await deployments.fixture(["diamond-init"]);

        const DiamondDeployment = await _hre.deployments.get("Diamond");
        const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);
        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
        };
    }),
    createMinter: deployments.createFixture(async _hre => {
        await deployments.fixture();

        const DiamondDeployment = await _hre.deployments.get("Diamond");
        const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);
        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
        };
    }),
    createMinterUser: deployments.createFixture(async _hre => {
        await deployments.fixture();

        const DiamondDeployment = await _hre.deployments.get("Diamond");
        const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);

        const collateralAndOracle = await addMockCollateralAsset();
        const krAssetAndOracle = await addMockKreskoAsset();

        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
            collaterals: [collateralAndOracle],
            krAssets: [krAssetAndOracle],
        };
    }),
    kreskoAsset: deployments.createFixture(async hre => {
        await deployments.fixture();

        const DiamondDeployment = await hre.deployments.get("Diamond");
        const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);

        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
            collaterals: hre.collaterals,
            krAssets: hre.krAssets,
        };
    }),
};
