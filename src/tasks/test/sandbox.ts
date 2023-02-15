/* eslint-disable @typescript-eslint/no-unused-vars */
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const TASK_NAME = "sandbox";
const log = getLogger(TASK_NAME);
// const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
task(TASK_NAME).setAction(async function (_taskArgs: TaskArguments, hre) {
    // const { deployer, operator, funder } = await hre.ethers.getNamedSigners();
    try {
        log.log("Starting");
        log.log("Finished");
    } catch (e) {
        log.error(e);
    }

    return;
});
