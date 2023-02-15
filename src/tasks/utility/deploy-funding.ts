import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import { KISS, Multisender, WETH } from "types";
import { TokenStruct } from "types/typechain/src/contracts/test/Multisender";

const TASK_NAME = "deploy-funding";
task(TASK_NAME, "funds a set of accounts", async (_, hre) => {
    const log = getLogger(TASK_NAME);

    const { deployer, funder } = await hre.ethers.getNamedSigners();

    const Tokens: TokenStruct[] = [];
    const KISS = await hre.ethers.getContract<KISS>("KISS");
    const WETH = await hre.ethers.getContract<WETH>("WETH");
    const [Multisender] = await hre.deploy<Multisender>("Multisender", {
        from: deployer.address,
        args: [Tokens, WETH, KISS],
    });

    await Multisender.toggleOwners([funder.address]);

    log.success(`Multisender deployed: ${Multisender.address} - funder is ${funder.address}`);

    return Multisender;
});
