import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { testnetConfigs } from "@deploy-config/opgoerli";
import { getLogger } from "@kreskolabs/lib";
import { getOracle } from "@utils/general";
import { TASK_WHITELIST_COLLATERAL } from "@tasks";

const logger = getLogger(TASK_WHITELIST_COLLATERAL);

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const collaterals = testnetConfigs[hre.network.name].collaterals;
    for (const collateral of collaterals) {
        if (!collateral.oracle) {
            logger.warn(`skipping ${collateral.name}/${collateral.symbol} as it has no oracle`);
            continue;
        }
        logger.log(`whitelisting collateral: name ${collateral.name} || symbol ${collateral.symbol}`);
        const inHouseOracleAddr = await getOracle(collateral.oracle.description, hre);
        const oracleAddr = hre.network.live ? collateral.oracle.chainlink || inHouseOracleAddr : inHouseOracleAddr;

        await hre.run(TASK_WHITELIST_COLLATERAL, {
            symbol: collateral.symbol,
            cFactor: collateral.cFactor,
            oracleAddr: oracleAddr,
            marketStatusOracleAddr: inHouseOracleAddr,
            log: true,
        });
    }

    logger.success("Succesfully whitelisted collaterals");
};

deploy.tags = ["local", "whitelist-collaterals", "all"];
deploy.dependencies = ["minter-init", "whitelist-krassets"];
deploy.skip = async hre => hre.network.live;

export default deploy;
