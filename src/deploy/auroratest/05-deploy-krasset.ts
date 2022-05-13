import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const { kresko } = hre;

    await hre.run("deploy:krasset", {
        name: "GameStop Corp.",
        symbol: "krGME",
        operator: kresko.address,
        log: true,
    });

    await hre.run("deploy:krasset", {
        name: "iShares Gold Trust",
        symbol: "krIAU",
        operator: kresko.address,
        log: true,
    });
    await hre.run("deploy:krasset", {
        name: "Tesla, Inc.",
        symbol: "krTSLA",
        operator: kresko.address,
        log: true,
    });
    await hre.run("deploy:krasset", {
        name: "Invesco QQQ Trust",
        symbol: "krQQQ",
        operator: kresko.address,
        log: true,
    });

    logger.success("Succesfully deployed krAssets");
};
export default func;
func.tags = ["auroratest"];
