import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("deploy:kresko", {
        wait: 3,
        log: true,
    });
};

func.tags = ["auroratest"];

export default func;
