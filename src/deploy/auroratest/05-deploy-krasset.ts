import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger, sleep } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");
    const { kresko } = hre;

    await hre.run("deploy:krasset", {
        name: "GameStop Corp.",
        symbol: "krGME",
        operator: kresko.address,
        log: true,
    });

    sleep(1500);

    await hre.run("deploy:krasset", {
        name: "iShares Gold Trust",
        symbol: "krIAU",
        operator: kresko.address,
        log: true,
    });

    sleep(1500);

    await hre.run("deploy:krasset", {
        name: "Tesla, Inc.",
        symbol: "krTSLA",
        operator: kresko.address,
        log: true,
    });
    sleep(1500);

    await hre.run("deploy:krasset", {
        name: "Invesco QQQ Trust",
        symbol: "krQQQ",
        operator: kresko.address,
        log: true,
    });
    sleep(1500);

    logger.success("Succesfully deployed krAssets");
};

func.tags = ["auroratest"];

export default func;
