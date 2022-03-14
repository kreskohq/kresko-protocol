import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { priceFeeds } = hre;

    await hre.run("kresko:addcollateral", {
        name: "USDC",
        cFactor: 0.9,
        oracleAddr: priceFeeds["/USD"].address,
        wait: 2,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        name: "Aurora",
        cFactor: 0.75,
        oracleAddr: priceFeeds["AURORA/USD"].address,
        wait: 2,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        name: "Wrapped Near",
        cFactor: 0.75,
        oracleAddr: priceFeeds["NEAR/USD"].address,
        wait: 2,
        log: true,
    });

    await hre.run("kresko:addcollateral", {
        name: "Wrapped Ether",
        cFactor: 0.85,
        oracleAddr: priceFeeds["ETH/USD"].address,
        log: true,
        wait: 2,
    });
};
export default func;

func.tags = ["auroratest"];
