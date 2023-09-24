import { getLogger, toBig } from "@kreskolabs/lib";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("create-kiss");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    await hre.deploy("MockOracle", {
        deploymentName: "KISSFeed",
        args: ["KISS/USD", toBig(1, 8), 8],
    });
    logger.success("Succesfully created KISS oracle");
};

deploy.tags = ["local", "KISS", "minter-init"];
deploy.dependencies = ["add-facets"];

export default deploy;
