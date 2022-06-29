import { getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";

task("transmit", "Submits an answer to a price feed")
    .addParam("contract", "The price feed contract to post to")
    .addParam("answer", "The answer to post")
    .addParam("marketOpen", "The market open boolean to post")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async (_taskArgs, hre) => {
        const { wait, log } = _taskArgs;
        const logger = getLogger("transmit", log);
        const FluxPriceFeed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", _taskArgs.contract);
        const tx = await FluxPriceFeed.transmit(_taskArgs.answer, _taskArgs.marketOpen);
        await tx.wait(wait);
        logger.log("transmit transaction hash:", tx.hash);
    });
