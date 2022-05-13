import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { treasury } = await hre.getNamedAccounts();
    await hre.run("deploy:kresko", {
        feeRecipient: treasury,
    });
    const logger = getLogger("deploy-kresko");
    logger.log("Kresko deployed");
};

func.tags = ["auroratest"];

export default func;
