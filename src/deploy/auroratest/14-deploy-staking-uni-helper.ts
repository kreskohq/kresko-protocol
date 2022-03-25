import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("deploy:stakingunihelper", { log: true });
};

func.tags = ["auroratest", "staking-uni-helper"];

export default func;
