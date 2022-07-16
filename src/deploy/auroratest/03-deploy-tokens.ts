import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/deploy-config";
import { MockWETH10 } from "types";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-tokens");

    const collaterals = testnetConfigs[hre.network.name].collaterals;

    for (const collateral of collaterals) {
        const isDeployed = await hre.deployments.getOrNull(collateral.symbol);
        if (collateral.symbol === "WETH") {
            await (await hre.ethers.getContract<MockWETH10>("WETH")).deposit(hre.toBig(collateral.mintAmount));
            continue;
        }
        if (isDeployed != null) continue;

        logger.log(`Deploying collateral token ${collateral.name}`);
        await hre.run("deploy:token", {
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

func.tags = ["auroratest", "deploy-collaterals"];

func.skip = async hre => {
    const logger = getLogger("deploy-tokens");
    const collaterals = testnetConfigs[hre.network.name].collaterals;
    const isFinished = await hre.deployments.getOrNull(collaterals[collaterals.length - 1].name);
    isFinished && logger.log("Skipping deploying mock tokens");
    return !!isFinished;
};

export default func;
