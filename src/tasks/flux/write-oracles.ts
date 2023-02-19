import { testnetConfigs } from "@deploy-config/testnet-goerli";
import { getLogger } from "@kreskolabs/lib";
import { writeFileSync } from "fs";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { FluxPriceFeedFactory } from "types";

task("write-oracles").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    const logger = getLogger("write-oracles");
    const Kresko = await hre.ethers.getContract<Kresko>("Diamond");
    const values = [];
    for (const collateral of testnetConfigs[hre.network.name].collaterals) {
        const contract = await hre.ethers.getContract(collateral.symbol);
        const collateralInfo = await Kresko.collateralAsset(contract.address);
        values.push({
            asset: await contract.symbol(),
            assetAddress: contract.address,
            assetType: "collateral",
            feed: collateral.oracle.description,
            marketstatus: collateralInfo.marketStatusOracle,
            pricefeed: collateralInfo.oracle,
        });
    }
    for (const krAsset of testnetConfigs[hre.network.name].krAssets) {
        const contract = await hre.ethers.getContract(krAsset.symbol);
        const krAssetInfo = await Kresko.collateralAsset(contract.address);
        values.push({
            asset: await contract.symbol(),
            assetAddress: contract.address,
            assetType: "krAsset",
            feed: krAsset.oracle.description,
            marketstatus: krAssetInfo.marketStatusOracle,
            pricefeed: krAssetInfo.oracle,
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
