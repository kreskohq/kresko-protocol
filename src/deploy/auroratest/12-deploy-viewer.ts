import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("deploy:viewer", {
        wait: 2,
    });
};

func.tags = ["auroratest", "viewer"];

export default func;
