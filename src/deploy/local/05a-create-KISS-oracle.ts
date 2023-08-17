import { assets, testnetConfigs } from "@deploy-config/arbitrumGoerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger, toBig } from "@kreskolabs/lib";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { TASK_DEPLOY_KISS, TASK_WHITELIST_COLLATERAL, TASK_WHITELIST_KRASSET } from "@tasks";
import { getOracle } from "@utils/test/helpers/oracle";

const logger = getLogger("create-kiss");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    await hre.deploy("SimpleFeed", {
        deploymentName: "KISSFeed",
        args: ["KISS/USD", toBig(1, 8)],
    });
    logger.success("Succesfully created KISS oracle");
};

deploy.tags = ["local", "KISS", "minter-init"];
deploy.dependencies = ["add-facets"];

export default deploy;
