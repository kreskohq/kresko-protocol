/* eslint-disable @typescript-eslint/no-var-requires */
import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";

const TASK_NAME = "create-exports";

const log = getLogger(TASK_NAME);
task(TASK_NAME).setAction(async function () {
    const exportUtil = await import("../utils/export");
    log.log("Creating exports...");
    await exportUtil.exportDeployments();
    log.log("Done!");
});
