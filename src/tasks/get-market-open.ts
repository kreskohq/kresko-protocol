import { getLogger } from "@kreskolabs/lib/meta";
import { task, types } from "hardhat/config";
import { TASK_ORACLE_LATEST_MARKET_OPEN } from "./names";

task(TASK_ORACLE_LATEST_MARKET_OPEN, "Fetches the latest market open")
  .addParam("contract", "The price feed contract to post to")
  .addOptionalParam("log", "log information", true, types.boolean)
  .setAction(async (_taskArgs, hre) => {
    const { contract, log } = _taskArgs;
    const FluxPriceFeed = await hre.ethers.getContractAt("FluxPriceFeed", contract);
    const logger = getLogger(TASK_ORACLE_LATEST_MARKET_OPEN, log);
    const tx = await FluxPriceFeed.latestMarketOpen();
    logger.log("Market open for", contract, ": ", tx.toString());
  });
