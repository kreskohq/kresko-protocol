import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task, types } from "hardhat/config";

task("updatePrices", "Fetches latest answers on oracles")
    .addParam("contract", "The price aggregator contract to update")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async (taskArgs, hre) => {
        const { log } = taskArgs;
        const logger = getLogger("updatePrices", log);
        const FluxPriceAggregator = await hre.ethers.getContract<FluxPriceAggregator>("FluxPriceAggregator");
        await FluxPriceAggregator.updatePrices();
        logger.log("Update prices for", FluxPriceAggregator.address);
    });
