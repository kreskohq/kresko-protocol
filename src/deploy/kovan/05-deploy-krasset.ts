import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { kresko } = hre;

    await hre.run("deploy:krasset", {
        name: "KrOil",
        symbol: "KrOil",
        operator: kresko.address,
    });
    await hre.run("deploy:krasset", {
        name: "KrGold",
        symbol: "KrGold",
        operator: kresko.address,
    });
    await hre.run("deploy:krasset", {
        name: "KrSilver",
        symbol: "KrSilver",
        operator: kresko.address,
    });
};
export default func;
func.tags = ["kovan", "krasset"];
