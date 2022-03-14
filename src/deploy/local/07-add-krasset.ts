import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { priceFeeds } = hre;

    await hre.run("kresko:addkrasset", {
        name: "krGOLD",
        kFactor: 1.1,
        oracleAddr: priceFeeds["GOLD/USD"].address,
        log: true,
    });
    await hre.run("kresko:addkrasset", {
        name: "krTSLA",
        kFactor: 1.25,
        oracleAddr: priceFeeds["TSLA/USD"].address,
        log: true,
    });

    await hre.run("kresko:addkrasset", {
        name: "krETH",
        kFactor: 1.15,
        oracleAddr: priceFeeds["ETH/USD"].address,
        log: true,
    });

    await hre.run("kresko:addkrasset", {
        name: "krQQQ",
        kFactor: 1.15,
        oracleAddr: priceFeeds["QQQ/USD"].address,
        log: true,
    });
};
export default func;

func.tags = ["local"];
