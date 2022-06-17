import { deployments, ethers } from "hardhat";
import { getUsers } from "./general";
import type { Kresko } from "types";

export const fixtures = {
    diamondInit: deployments.createFixture(async _hre => {
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
    minterInit: deployments.createFixture(async _hre => {
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
