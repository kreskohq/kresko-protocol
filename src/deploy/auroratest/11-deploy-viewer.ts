import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    await hre.run("deploy:viewer", {});
};

func.skip = async hre => {
    const isDeployed = await hre.deployments.getOrNull("KreskoViewer");
    return !!isDeployed;
};
func.tags = ["auroratest", "viewer"];
export default func;
