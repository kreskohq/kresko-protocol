import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import { TokenStruct } from "types/typechain/src/contracts/test/Multisender";
import { TASK_DEPLOY_FUNDER } from "./names";

const logger = getLogger(TASK_DEPLOY_FUNDER);

task(TASK_DEPLOY_FUNDER, "deploys the multisender for funding", async (_, hre) => {
    logger.log(`Deploying Multisender`);
    const { deployer, funder } = await hre.ethers.getNamedSigners();

    const Tokens: TokenStruct[] = [];
    const KISS = await hre.getContractOrFork("KISS");
    const WETH = await hre.getContractOrFork("WETH");
    const [Multisender] = await hre.deploy("Multisender", {
        from: deployer.address,
        args: [Tokens, WETH, KISS],
    });
    logger.log(`Toggling owner ${funder.address}`);
    await Multisender.toggleOwners([funder.address]);
    logger.log(`Toggled owner ${funder.address}`);

    logger.success(`Multisender deployed: ${Multisender.address} - funder is ${funder.address}`);

    return Multisender;
});
