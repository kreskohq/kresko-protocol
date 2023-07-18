import { assets, testnetConfigs } from "@deploy-config/arbitrumGoerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { TASK_DEPLOY_KISS, TASK_WHITELIST_COLLATERAL, TASK_WHITELIST_KRASSET } from "@tasks";

const logger = getLogger("create-kiss");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    // Create KISS first
    const { contract: KISSContract } = await hre.run(TASK_DEPLOY_KISS);

    logger.log(`whitelisting KISS`);

    if (!assets.KISS.oracle) {
        logger.warn(`skipping KISS as it has no oracle`);
        return;
    }
    const oracleAddress = (await hre.deployments.get("KISSFeed")).address;
    await hre.run(TASK_WHITELIST_KRASSET, {
        symbol: assets.KISS.symbol,
        kFactor: assets.KISS.kFactor,
        supplyLimit: 2_000_000_000,
        oracleAddr: oracleAddress,
    });

    await hre.run(TASK_WHITELIST_COLLATERAL, {
        symbol: assets.KISS.symbol,
        cFactor: assets.KISS.cFactor,
        oracleAddr: oracleAddress,
        log: !process.env.TEST,
    });

    await hre.Diamond.updateKiss(KISSContract.address);
    logger.success("Succesfully created KISS");
};

deploy.skip = async hre => {
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const isFinished = await hre.deployments.getOrNull(krAssets[krAssets.length - 1].name);
    isFinished && logger.log("Skipping deploying krAssets");
    return !!isFinished || hre.network.live;
};

deploy.tags = ["local", "KISS", "minter-init"];
deploy.dependencies = ["add-facets"];

export default deploy;
