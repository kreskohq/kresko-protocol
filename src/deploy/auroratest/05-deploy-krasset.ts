import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { kresko } = hre;

    await hre.run("deploy:krasset", {
        name: "krETH",
        symbol: "krETH",
        operator: kresko.address,
        wait: 2,
        log: true,
    });

    await hre.run("deploy:krasset", {
        name: "krGOLD",
        symbol: "KrGold",
        operator: kresko.address,
        wait: 2,
        log: true,
    });
    await hre.run("deploy:krasset", {
        name: "krTSLA",
        symbol: "krTSLA",
        operator: kresko.address,
        wait: 2,
        log: true,
    });
    await hre.run("deploy:krasset", {
        name: "krQQQ",
        symbol: "krQQQ",
        operator: kresko.address,
        wait: 2,
        log: true,
    });
};
export default func;
func.tags = ["auroratest"];
