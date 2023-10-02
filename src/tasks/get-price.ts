import { getLogger } from "@kreskolabs/lib/meta";
import { task, types } from "hardhat/config";
import { TASK_ORACLE_LATEST_ANSWER } from "./names";

task(TASK_ORACLE_LATEST_ANSWER, "Fetches the latest answer")
    .addParam("contract", "The price feed contract to post to")
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async (_taskArgs, hre) => {
        const { contract, log } = _taskArgs;
        const FluxPriceFeed = await hre.ethers.getContractAt("FluxPriceFeed", contract);
        const logger = getLogger(TASK_ORACLE_LATEST_ANSWER, log);
        const tx = await FluxPriceFeed.latestAnswer();
        logger.log("Price for", contract, ": ", tx.toString());
    });
