import { toBig } from "@kreskolabs/lib";
import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const TASK_NAME = "fund-operator";

const log = getLogger(TASK_NAME);
task(TASK_NAME).setAction(async function (taskArgs: TaskArguments, hre) {
    const users = await hre.ethers.getNamedSigners();
    const tx = await users.deployer.sendTransaction({
        to: users.operator.address,
        value: toBig(0.1),
    });
    await tx.wait();
    log.success(`Sent 0.1 ether to operator in ${users.operator.address}`);
    return;
});
