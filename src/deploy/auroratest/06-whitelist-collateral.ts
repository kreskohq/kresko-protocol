import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger, sleep } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("whitelist-collateral");

    const { priceFeeds } = hre;

    if (Object.keys(priceFeeds).length === 0) {
        priceFeeds["/USD"] = await hre.ethers.getContract("USD");
        priceFeeds["AURORA/USD"] = await hre.ethers.getContract("AURORAUSD");
        priceFeeds["NEAR/USD"] = await hre.ethers.getContract("NEARUSD");
        priceFeeds["ETH/USD"] = await hre.ethers.getContract("ETHUSD");
        priceFeeds["GME/USD"] = await hre.ethers.getContract("GMEUSD");
        priceFeeds["GOLD/USD"] = await hre.ethers.getContract("GOLDUSD");
        priceFeeds["TSLA/USD"] = await hre.ethers.getContract("TSLAUSD");
        priceFeeds["QQQ/USD"] = await hre.ethers.getContract("QQQUSD");
    }

    await hre.run("kresko:addcollateral", {
        symbol: "USDC",
        cFactor: 0.95,
        oracleAddr: priceFeeds["/USD"].address,
        log: true,
    });
    sleep(1500);
    await hre.run("kresko:addcollateral", {
        symbol: "AURORA",
        cFactor: 0.75,
        oracleAddr: priceFeeds["AURORA/USD"].address,
        log: true,
    });
    sleep(1500);
    await hre.run("kresko:addcollateral", {
        symbol: "wNEAR",
        cFactor: 0.7,
        oracleAddr: priceFeeds["NEAR/USD"].address,
        log: true,
    });
    sleep(1500);
    await hre.run("kresko:addcollateral", {
        symbol: "WETH",
        cFactor: 0.7,
        oracleAddr: priceFeeds["ETH/USD"].address,
        log: true,
    });

    logger.success("Succesfully whitelisted collaterals");
};

func.tags = ["auroratest"];

export default func;
