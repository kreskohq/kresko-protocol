import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("deploy-staking-helper", { log: true });
    await hre.run("initialize-viewer", { log: true });
    const logger = getLogger("Deployment", true);

    logger.success("Deployment successfull");
};

func.tags = ["testnet", "helpers"];
func.dependencies = ["staking-incentives"];
export default func;
