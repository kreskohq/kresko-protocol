import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { priceFeeds } = hre;
    const logger = getLogger("add-krasset");
    await hre.run("kresko:addkrasset", {
        symbol: "krIAU",
        kFactor: 1.1,
        oracleAddr: priceFeeds["GOLD/USD"].address,
    });
    await hre.run("kresko:addkrasset", {
        symbol: "krTSLA",
        kFactor: 1.25,
        oracleAddr: priceFeeds["TSLA/USD"].address,
    });

    await hre.run("kresko:addkrasset", {
        symbol: "krGME",
        kFactor: 1.25,
        oracleAddr: priceFeeds["GME/USD"].address,

        log: true,
    });

    await hre.run("kresko:addkrasset", {
        symbol: "krQQQ",
        kFactor: 1.2,
        oracleAddr: priceFeeds["QQQ/USD"].address,

        log: true,
    });

    logger.log("All krassets added");
};
export default func;

func.tags = ["auroratest"];
