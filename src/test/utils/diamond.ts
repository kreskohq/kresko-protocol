import { deployments, ethers } from "hardhat";
import { getUsers } from "./general";
import { constants } from "ethers";
import type { Kresko } from "types";

export const withFixture = (fixtureName: "createBaseDiamond" | "createMinter") => {
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
    });
};
const fixtures = {
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
};
