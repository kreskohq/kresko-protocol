import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("deploy:stakingunihelper", { log: true });
    const logger = getLogger("Deployment", true);

    logger.success("Deployment successfull");
};

func.tags = ["auroratest", "staking-uni-helper"];

export default func;
