import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { priceFeeds } = hre;
    const logger = getLogger("add-krasset");
    await hre.run("kresko:addkrasset", {
        name: "krGOLD",
        kFactor: 1.05,
        oracleAddr: priceFeeds["GOLD/USD"].address,
        wait: 2,
    });
    await hre.run("kresko:addkrasset", {
        name: "krTSLA",
        kFactor: 1.125,
        oracleAddr: priceFeeds["TSLA/USD"].address,
        wait: 2,
    });

    await hre.run("kresko:addkrasset", {
        name: "krETH",
        kFactor: 1.15,
        oracleAddr: priceFeeds["ETH/USD"].address,
        wait: 2,
        log: true,
    });

    await hre.run("kresko:addkrasset", {
        name: "krQQQ",
        kFactor: 1.1,
        oracleAddr: priceFeeds["QQQ/USD"].address,
        wait: 2,
        log: true,
    });

    logger.log("All krassets added");
};
export default func;

func.tags = ["auroratest"];
