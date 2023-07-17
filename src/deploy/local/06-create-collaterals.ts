import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { WETH } from "types/typechain/src/contracts/test/WETH";
import { getLogger, toBig } from "@kreskolabs/lib";
import { TASK_DEPLOY_TOKEN } from "@tasks";
const logger = getLogger("deploy-tokens");

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    if (hre.network.live) {
        throw new Error("Trying to use local deployment script on live network.");
    }

    const collaterals = testnetConfigs[hre.network.name].collaterals;
    for (const collateral of collaterals) {
        if (!collateral.testAsset) continue;
        const isDeployed = await hre.deployments.getOrNull(collateral.symbol);

        if (collateral.symbol === "WETH") {
            let WETH: WETH;
            if (!isDeployed) {
                [WETH] = await hre.deploy("WETH", {
                    from: hre.users.deployer.address,
                });
            } else {
                WETH = await hre.getContractOrFork("WETH");
            }
            await WETH["deposit(uint256)"](toBig(collateral.mintAmount!));
            continue;
        }
        if (isDeployed != null || !!collateral.kFactor) continue;

        logger.log(`Deploying collateral test token ${collateral.name}`);

        await hre.run(TASK_DEPLOY_TOKEN, {
            name: collateral.name,
            symbol: collateral.symbol,
            log: true,
            amount: collateral.mintAmount,
            decimals: collateral.decimals,
        });
        logger.log(`Deployed ${collateral.name}`);
    }

    logger.success("Succesfully deployed collateral tokens");
};

deploy.tags = ["local", "collaterals", "all"];
deploy.dependencies = ["minter-init"];

deploy.skip = async hre => {
    const collaterals = testnetConfigs[hre.network.name].collaterals;
    const isFinished = await hre.deployments.getOrNull(collaterals[collaterals.length - 1].name);
    if (isFinished) {
        logger.log("Skipping deploying mock tokens");
    }
    return !!isFinished || hre.network.live;
};

export default deploy;
