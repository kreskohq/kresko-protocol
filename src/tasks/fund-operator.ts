import { toBig } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("fund-operator").setAction(async function (taskArgs: TaskArguments, hre) {
    const users = await hre.ethers.getNamedSigners();
    const tx = await users.deployer.sendTransaction({
        to: users.operator.address,
        value: toBig(0.1),
    });
    await tx.wait();
    console.log("Sent 0.1 ether to operator");
    return;
});
