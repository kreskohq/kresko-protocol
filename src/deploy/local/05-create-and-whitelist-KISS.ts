import { assets, testnetConfigs } from "@deploy-config/opgoerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { TASK_DEPLOY_KISS, TASK_WHITELIST_COLLATERAL, TASK_WHITELIST_KRASSET } from "@tasks";
import { getOracle } from "@utils/test/helpers/oracle";

const logger = getLogger("create-kiss");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    // Create KISS first
    const { contract: KISSContract } = await hre.run(TASK_DEPLOY_KISS, {
        amount: assets.KISS.mintAmount,
        decimals: 18,
    });

    logger.log(`whitelisting KISS`);

    if (!assets.KISS.oracle) {
        logger.warn(`skipping KISS as it has no oracle`);
        return;
    }
    const oracleAddress = await getOracle(assets.KISS.oracle.description, hre);
    await hre.run(TASK_WHITELIST_KRASSET, {
        symbol: assets.KISS.symbol,
        kFactor: assets.KISS.kFactor,
        supplyLimit: 2_000_000_000,
        oracleAddr: oracleAddress,
        marketStatusOracleAddr: oracleAddress,
    });

    await hre.run(TASK_WHITELIST_COLLATERAL, {
        symbol: assets.KISS.symbol,
        cFactor: assets.KISS.cFactor,
        oracleAddr: oracleAddress,
        marketStatusOracleAddr: oracleAddress,
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
deploy.dependencies = ["add-facets", "oracles"];

export default deploy;
