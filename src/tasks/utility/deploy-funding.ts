import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import { TokenStruct } from "types/typechain/src/contracts/test/Multisender";

const TASK_NAME = "deploy-funding";
task(TASK_NAME, "funds a set of accounts", async (_, hre) => {
    const log = getLogger(TASK_NAME);

    const { deployer, funder } = await hre.ethers.getNamedSigners();

    const Tokens: TokenStruct[] = [];
    const KISS = await hre.getContractOrFork("KISS");
    const WETH = await hre.getContractOrFork("WETH");
    const [Multisender] = await hre.deploy("Multisender", {
        from: deployer.address,
        args: [Tokens, WETH, KISS],
    });

    await Multisender.toggleOwners([funder.address]);

    log.success(`Multisender deployed: ${Multisender.address} - funder is ${funder.address}`);

    return Multisender;
});
