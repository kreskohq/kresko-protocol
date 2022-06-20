import { deployments, ethers } from "hardhat";
import { addCollateralAsset, addKreskoAsset, getUsers } from "./general";
import { constants } from "ethers";
import type { ERC20Upgradeable, Kresko } from "types";
import { Deployment, Facet } from "@kreskolabs/hardhat-deploy/dist/types";
import { MockContract } from "@defi-wonderland/smock";

type FixtureName = "createBaseDiamond" | "createMinter" | "createMinterUser";

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
        collaterals?: [MockContract<ERC20Upgradeable>, MockContract<FluxPriceAggregator>][];
        krAssets?: [MockContract<KreskoAsset>, MockContract<FluxPriceAggregator>][];
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

        const collateralAndOracle = await addCollateralAsset();
        const krAssetAndOracle = await addKreskoAsset();

        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
            collaterals: [collateralAndOracle],
            krAssets: [krAssetAndOracle],
        };
    }),
};
