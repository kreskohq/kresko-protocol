import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task, types } from "hardhat/config";

task("latestAnswer", "Fetches the latest answer")
    .addParam("contract", "The price feed contract to post to")
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async (_taskArgs, hre) => {
        const { contract, log } = _taskArgs;
        const FluxPriceFeed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", contract);
        const logger = getLogger("latestAnswer", log);
        const tx = await FluxPriceFeed.latestAnswer();
        logger.log("Price for", contract, ": ", tx.toString());
    });
