/* eslint-disable @typescript-eslint/no-unused-vars */
import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_SANDBOX } from "../names";
// import fetch from "node-fetch";
// eslint-disable-next-line @typescript-eslint/no-var-requires

const log = getLogger(TASK_SANDBOX);
task(TASK_SANDBOX).setAction(async function (_taskArgs: TaskArguments, hre) {
    log.log("running sandbox task");
    // const all = await hre.deployments.all();
    return;
});
