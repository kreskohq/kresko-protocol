import { task } from "hardhat/config";

task("latestAnswer", "Fetches the latest answer")
    .addParam("contract", "The price feed contract to post to")
    .setAction(async (_taskArgs, hre) => {
        const FluxPriceFeed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", _taskArgs.contract);
        const tx = await FluxPriceFeed.latestAnswer();
        console.log(tx.toString());
    });
