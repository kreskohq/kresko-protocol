import { getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";

task("latestMarketOpen", "Fetches the latest market open boolean")
    .addParam("contract", "The price feed contract to post to")
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async (_taskArgs, hre) => {
        const { contract, log } = _taskArgs;
        const FluxPriceFeed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", contract);
        const logger = getLogger("latestMarketOpen", log);
        const tx = await FluxPriceFeed.latestMarketOpen();
        logger.log("Price for", contract, ": ", tx.valueOf());
    });
