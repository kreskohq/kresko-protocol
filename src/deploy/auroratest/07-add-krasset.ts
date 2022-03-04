import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { priceFeeds } = hre;

    await hre.run("kresko:addkrasset", {
        name: "krGOLD",
        kFactor: 1.1,
        oracleAddr: priceFeeds["GOLD/USD"].address,
        wait: 3,
    });
    await hre.run("kresko:addkrasset", {
        name: "krTSLA",
        kFactor: 1.25,
        oracleAddr: priceFeeds["TSLA/USD"].address,
        wait: 3,
    });

    await hre.run("kresko:addkrasset", {
        name: "krETH",
        kFactor: 1.15,
        oracleAddr: priceFeeds["ETH/USD"].address,
        wait: 3,
        log: true,
    });
};
export default func;

func.tags = ["auroratest"];
