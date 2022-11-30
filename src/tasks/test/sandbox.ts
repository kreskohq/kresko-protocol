import { testnetConfigs } from "@deploy-config/testnet";
import { fromBig } from "@kreskolabs/lib/dist/numbers";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { FluxPriceFeedFactory } from "types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator, deployer, operator } = await hre.getNamedAccounts();
    const factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    const assets = [...testnetConfigs[hre.network.name].collaterals, ...testnetConfigs[hre.network.name].krAssets];
    const logger = getLogger("sandbox");
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const deployment = await factory.addressOfPricePair(asset.oracle.description, 8, feedValidator);

        const feed = await hre.ethers.getContractAt<FluxPriceFeed>("FluxPriceFeed", deployment);

        const answer = await feed.latestAnswer();

        const marketOpen = await feed.latestMarketOpen();

        logger.log(asset.oracle.description, fromBig(answer, 8), marketOpen);
        // if (deployment != null) {
        //     logger.log(`Oracle already deployed for ${asset.symbol}`);
        //     logger.log(`Checking price..`);
        //     const oracle = await hre.ethers.getContractAt<FluxPriceFeed>(
        //         "FluxPriceFeed",
        //         deployment.address,
        //         feedValidator,
        //     );

        //     const marketOpen = await oracle.latestMarketOpen();
        //     const price = await oracle.latestAnswer();
        //     if (price.gt(0)) {
        //         logger.log("Price found, skipping");
        //         continue;
        //     } else {
        //         const price = await asset.price();
        //         logger.log(`Price not found, transmitting.. ${asset.symbol} - ${price.toString()}`);
        //         await oracle.transmit(price, marketOpen);
        //         logger.success(`Price and market status transmitted`);
        //         continue;
        //     }
        // }
    }
    // for (const oracle of oracles.testnet) {
    // }
});
