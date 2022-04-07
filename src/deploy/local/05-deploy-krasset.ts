import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const { kresko } = hre;

    await hre.run("deploy:krasset", {
        name: "krETH",
        symbol: "krETH",
        operator: kresko.address,
        log: true,
    });

    await hre.run("deploy:krasset", {
        name: "krGOLD",
        symbol: "KrGold",
        operator: kresko.address,
        log: true,
    });
    await hre.run("deploy:krasset", {
        name: "krTSLA",
        symbol: "krTSLA",
        operator: kresko.address,
        log: true,
    });

    await hre.run("deploy:krasset", {
        name: "krQQQ",
        symbol: "krQQQ",
        operator: kresko.address,
        log: true,
    });
    logger.success("Succesfully deployed krAssets");
};
export default func;
func.tags = ["local"];
