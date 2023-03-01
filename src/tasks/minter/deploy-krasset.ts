import { getLogger } from "@kreskolabs/lib";
import { createKrAsset } from "@scripts/create-krasset";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy-krasset")
    .addParam("name", "Name of the token")
    .addParam("symbol", "Symbol for the token")
    .setAction(async function (taskArgs: TaskArguments) {
        const logger = getLogger("deploy-krasset");
        const { name, symbol } = taskArgs;
        logger.log("deploying krAsset", name, symbol);
        const asset = await createKrAsset(name, symbol);
        logger.log("deployed krAsset", asset.address);
    });
