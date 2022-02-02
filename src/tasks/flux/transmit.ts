import { Signer } from "@ethersproject/abstract-signer";
import { task } from "hardhat/config";

task("transmit", "Submits an answer to a price feed")
    .addParam("contract", "The price feed contract to post to")
    .addParam("answer", "The answer to post")
    .setAction(async (_taskArgs, hre) => {
        const FluxPriceFeed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", _taskArgs.contract);
        const tx = await FluxPriceFeed.transmit(_taskArgs.answer);
        console.log("Transaction hash:", tx.hash);
    });
