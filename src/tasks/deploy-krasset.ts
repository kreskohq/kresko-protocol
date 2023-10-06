import { getLogger } from "@kreskolabs/lib/meta";
import { createKrAsset } from "@scripts/create-krasset";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_DEPLOY_KRASSET } from "./names";

const logger = getLogger(TASK_DEPLOY_KRASSET);

task(TASK_DEPLOY_KRASSET)
  .addParam("name", "Name of the token")
  .addParam("symbol", "Symbol for the token")
  .setAction(async function (taskArgs: TaskArguments) {
    const { name, symbol } = taskArgs;
    logger.log("Deploying krAsset", name, symbol);
    const asset = await createKrAsset(name, symbol);
    logger.success("Deployed krAsset", asset.KreskoAsset.address);
  });
