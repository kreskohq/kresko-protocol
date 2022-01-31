import { Signer } from "@ethersproject/abstract-signer";
import { task } from "hardhat/config";

task("updatePrices", "Fetches latest answers on oracles")
    .addParam("contract", "The price aggregator contract to update")
    .setAction(async (_taskArgs, hre) => {
        const FluxPriceAggregator = await hre.ethers.getContract<FluxPriceAggregator>("FluxPriceAggregator");
        const tx = await FluxPriceAggregator.updatePrices();
        console.log(tx.toString());
    });
