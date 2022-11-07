import { task, types } from "hardhat/config";

task("transmit", "Submits an answer to a price feed")
    .addParam("contract", "The price feed contract to post to")
    .addParam("answer", "The answer to post")
    .addParam("marketOpen", "The market open boolean to post")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async (_taskArgs, hre) => {
        const FluxPriceFeed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", _taskArgs.contract);
        await FluxPriceFeed.transmit(_taskArgs.answer, _taskArgs.marketOpen);
    });
