import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/testnet-goerli";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { WETH } from "types/typechain/src/contracts/test/WETH";
import { getLogger } from "@kreskolabs/lib";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-tokens");
    const collaterals = testnetConfigs[hre.network.name].collaterals;
    for (const collateral of collaterals) {
        if (!collateral.testAsset) continue;
        const isDeployed = await hre.deployments.getOrNull(collateral.symbol);

        if (collateral.symbol === "WETH") {
            let WETH: WETH;
            if (!isDeployed) {
                [WETH] = await hre.deploy<WETH>("WETH", {
                    from: hre.users.deployer.address,
                });
            } else {
                WETH = await hre.ethers.getContract<WETH>("WETH");
            }
            await WETH["deposit(uint256)"](hre.toBig(collateral.mintAmount));
            continue;
        }
        if (isDeployed != null || !!collateral.kFactor) continue;

        logger.log(`Deploying collateral test token ${collateral.name}`);
        await hre.run("deploy-token", {
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
func.tags = ["testnet", "collaterals", "all"];
func.dependencies = ["minter-init"];

func.skip = async hre => {
    const logger = getLogger("deploy-tokens");
    const collaterals = testnetConfigs[hre.network.name].collaterals;
    const isFinished = await hre.deployments.getOrNull(collaterals[collaterals.length - 1].name);
    isFinished && logger.log("Skipping deploying mock tokens");
    return !!isFinished;
};

export default func;
