import { testnetConfigs } from "@deploy-config/testnet-goerli";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { FluxPriceFeedFactory } from "types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    const logger = getLogger("sandbox");
    for (const collateral of testnetConfigs[hre.network.name].collaterals) {
        const fluxFeed = await factory.addressOfPricePair(collateral.oracle.description, 8, feedValidator.address);
        console.log(collateral.symbol, fluxFeed);
    }
    for (const krAsset of testnetConfigs[hre.network.name].krAssets) {
        const fluxFeed = await factory.addressOfPricePair(krAsset.oracle.description, 8, feedValidator.address);
        console.log(krAsset.symbol, fluxFeed);
    }
    logger.success("All price feeds deployed");
});
