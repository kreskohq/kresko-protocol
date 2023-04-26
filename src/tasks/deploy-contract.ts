import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import { TASK_DEPLOY_CONTRACT } from "./names";

const logger = getLogger(TASK_DEPLOY_CONTRACT);

task(TASK_DEPLOY_CONTRACT, "deploy something", async (_, hre) => {
    logger.log(`Deploying contract...`);
    const { deployer } = await hre.ethers.getNamedSigners();

    const Factory = await hre.getContractOrFork("UniswapV2Factory");
    const WETH = "0x4200000000000000000000000000000000000006";

    const ContractName = "UniswapV2Router02";
    const args = [Factory.address, WETH];

    const [Contract] = await hre.deploy(ContractName, {
        from: deployer.address,
        args,
    });

    logger.success(`Contract deployed: ${Contract.address}`);

    return Contract;
});
