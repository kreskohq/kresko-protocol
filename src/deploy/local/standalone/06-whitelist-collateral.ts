import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@utils/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("whitelist-collateral");
    const { priceFeeds } = hre;

    await hre.run("kresko:addcollateral", {
        name: "USDC",
        cFactor: 0.95,
        oracleAddr: priceFeeds["/USD"].address,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        name: "Aurora",
        cFactor: 0.75,
        oracleAddr: priceFeeds["AURORA/USD"].address,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        name: "Wrapped Near",
        cFactor: 0.75,
        oracleAddr: priceFeeds["NEAR/USD"].address,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        name: "Wrapped Ether",
        cFactor: 0.85,
        oracleAddr: priceFeeds["ETH/USD"].address,
        log: true,
    });
    logger.success("Succesfully whitelisted collaterals");
};
export default func;

func.tags = ["auroratest"];
