import { getLogger } from "@kreskolabs/lib";
import { exportDeployments } from "@utils/export";
import { task } from "hardhat/config";

const TASK_NAME = "create-exports";

const log = getLogger(TASK_NAME);
task(TASK_NAME).setAction(async function () {
    log.log("Creating exports...");
    await exportDeployments();
    log.log("Done!");
});
