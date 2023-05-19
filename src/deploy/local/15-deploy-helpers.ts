import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { getLogger } from "@kreskolabs/lib";
import { TASK_DEPLOY_STAKING_HELPER } from "@tasks";

const logger = getLogger("deploy-helpers");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    logger.log("Deploying helpers");
    await hre.run(TASK_DEPLOY_STAKING_HELPER, { log: true });
    logger.success("Helpers deployed and initialized");
};

deploy.tags = ["local", "helpers", "staking-deployment"];
deploy.dependencies = ["staking-incentives"];
deploy.skip = async hre => hre.network.live || !!process.env.COVERAGE;

export default deploy;
