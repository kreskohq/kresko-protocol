/* eslint-disable @typescript-eslint/no-var-requires */
import { getLogger } from "@kreskolabs/lib/meta";
import { task } from "hardhat/config";
import { TASK_CREATE_EXPORTS } from "../names";

const logger = getLogger(TASK_CREATE_EXPORTS);

task(TASK_CREATE_EXPORTS).setAction(async function () {
    const exportUtil = await import("../../utils/export");

    logger.log("Creating exports...");
    await exportUtil.exportDeployments();
    logger.log("Done!");
});
