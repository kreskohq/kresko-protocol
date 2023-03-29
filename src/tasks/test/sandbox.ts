/* eslint-disable @typescript-eslint/no-unused-vars */
import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const TASK_NAME = "sandbox";
const log = getLogger(TASK_NAME);
task(TASK_NAME).setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer } = await hre.ethers.getNamedSigners();

    const Diamond = await hre.getContractOrFork("Kresko");

    try {
        console.log(Diamond.address);
        log.log("Finished");
    } catch (e) {
        log.error(e);
    }

    return;
});
