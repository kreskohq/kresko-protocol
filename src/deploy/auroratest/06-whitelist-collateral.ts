import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("whitelist-collateral");

    const { priceFeeds } = hre;

    await hre.run("kresko:addcollateral", {
        symbol: "USDC",
        cFactor: 0.95,
        oracleAddr: priceFeeds["/USD"].address,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        symbol: "AURORA",
        cFactor: 0.75,
        oracleAddr: priceFeeds["AURORA/USD"].address,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        symbol: "wNEAR",
        cFactor: 0.7,
        oracleAddr: priceFeeds["NEAR/USD"].address,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        symbol: "WETH",
        cFactor: 0.7,
        oracleAddr: priceFeeds["ETH/USD"].address,
        log: true,
    });

    logger.success("Succesfully whitelisted collaterals");
};
export default func;

func.tags = ["auroratest"];
