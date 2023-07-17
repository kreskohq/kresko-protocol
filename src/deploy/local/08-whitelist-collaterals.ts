import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import { getLogger } from "@kreskolabs/lib";
import { TASK_WHITELIST_COLLATERAL } from "@tasks";

const logger = getLogger(TASK_WHITELIST_COLLATERAL);

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const collaterals = testnetConfigs[hre.network.name].collaterals;
    for (const collateral of collaterals) {
        if (!collateral.oracle || !collateral.price) {
            logger.warn(`skipping ${collateral.name}/${collateral.symbol} as it has no oracle`);
            continue;
        }
        logger.log(`whitelisting collateral: name ${collateral.name} || symbol ${collateral.symbol}`);

        const oracleAddr = hre.network.live
            ? collateral.oracle.chainlink
            : (
                  await hre.deploy("SimpleFeed", {
                      deploymentName: "SimpleFeed_" + collateral.symbol,
                      args: [`${collateral.symbol}/USD`, await collateral.price()],
                  })
              )[0].address;

        await hre.run(TASK_WHITELIST_COLLATERAL, {
            symbol: collateral.symbol,
            cFactor: collateral.cFactor,
            oracleAddr: oracleAddr,
            log: true,
        });
    }

    logger.success("Succesfully whitelisted collaterals");
};

deploy.tags = ["local", "whitelist-collaterals", "all"];
deploy.dependencies = ["minter-init", "whitelist-krassets"];
deploy.skip = async hre => hre.network.live;

export default deploy;
