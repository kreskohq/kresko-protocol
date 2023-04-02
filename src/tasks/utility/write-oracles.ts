import { testnetConfigs } from "@deploy-config/opgoerli";
import { getLogger } from "@kreskolabs/lib";
import { writeFileSync } from "fs";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_WRITE_ORACLE_JSON } from "../names";

const logger = getLogger(TASK_WRITE_ORACLE_JSON);

task(TASK_WRITE_ORACLE_JSON).setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const factory = await hre.getContractOrFork("FluxPriceFeedFactory");

    const Kresko = await hre.getContractOrFork("Kresko");
    const values = [];
    for (const collateral of testnetConfigs[hre.network.name].collaterals) {
        const contract = await hre.getContractOrFork("ERC20Upgradeable", collateral.symbol);
        const collateralInfo = await Kresko.collateralAsset(contract.address);
        if (!collateral.oracle) continue;
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
        const contract = await hre.getContractOrFork("ERC20Upgradeable", krAsset.symbol);
        const krAssetInfo = await Kresko.collateralAsset(contract.address);
        if (!krAsset.oracle) continue;
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
    writeFileSync("./packages/contracts/src/deployments/json/oracles.json", JSON.stringify(values));
    logger.success("feeds: packages/contracts/src/deployments/json/oracles.json");
});
