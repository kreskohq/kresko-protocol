import { getLogger } from "@kreskolabs/lib/meta";
import { task } from "hardhat/config";
import { TASK_DEPLOY_CONTRACT } from "./names";

const logger = getLogger(TASK_DEPLOY_CONTRACT);

task(TASK_DEPLOY_CONTRACT, "deploy something", async (_, hre) => {
    logger.log(`Deploying contract...`);
    const { deployer } = await hre.ethers.getNamedSigners();
    const Factory = await hre.getContractOrFork("UniswapV2Factory");
    const Router = await hre.getContractOrFork("UniswapV2Router02");
    const Staking = await hre.getContractOrFork("KrStaking");
    const [Contract] = await hre.deploy("KrStakingHelper", {
        from: deployer.address,
        args: [Router.address, Factory.address, Staking.address],
    });

    logger.success(`Contract deployed: ${Contract.address}`);

    return Contract;
});
