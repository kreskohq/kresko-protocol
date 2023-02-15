import { testnetConfigs } from "@deploy-config/testnet-goerli";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { writeFileSync } from "fs";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { FluxPriceFeedFactory } from "types";

task("write-oracles").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    const logger = getLogger("write-oracles");

    const values = [];
    for (const collateral of testnetConfigs[hre.network.name].collaterals) {
        const fluxFeed = await factory.addressOfPricePair(collateral.oracle.description, 8, feedValidator.address);
        values.push({
            asset: collateral.symbol,
            assetType: "collateral",
            feed: collateral.oracle.description,
            marketstatus: fluxFeed,
            pricefeed: collateral.oracle.chainlink ? collateral.oracle.chainlink : fluxFeed,
        });
    }
    for (const krAsset of testnetConfigs[hre.network.name].krAssets) {
        const fluxFeed = await factory.addressOfPricePair(krAsset.oracle.description, 8, feedValidator.address);
        values.push({
            asset: krAsset.symbol,
            assetType: "krAsset",
            feed: krAsset.oracle.description,
            marketstatus: fluxFeed,
            pricefeed: krAsset.oracle.chainlink ? krAsset.oracle.chainlink : fluxFeed,
        });
    }

    const fluxFeedKiss = await factory.addressOfPricePair("KISS/USD", 8, feedValidator.address);
    values.push({
        asset: "KISS",
        assetType: "KISS",
        feed: "KISS/USD",
        marketstatus: fluxFeedKiss,
        pricefeed: fluxFeedKiss,
    });
    writeFileSync("packages/contracts/deployments/oracles.json", JSON.stringify(values));
    logger.success("Price feeds written to packages/contracts/deployments");
});
