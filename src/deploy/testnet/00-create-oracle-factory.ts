import { testnetConfigs } from "@deploy-config/testnet";
import type { DeployFunction, DeploymentSubmission } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import type { FluxPriceFeedFactory } from "types";

const func: DeployFunction = async function (hre) {
    const { feedValidator, deployer, operator } = await hre.getNamedAccounts();
    const [factory] = await hre.deploy<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    const assets = [...testnetConfigs[hre.network.name].collaterals, ...testnetConfigs[hre.network.name].krAssets];
    const logger = getLogger("create-oracle-factory");
    const pricePairs = assets.map(asset => asset.oracle.description);
    const prices = await Promise.all(assets.map(asset => asset.price()));
    const decimals = assets.map(() => 8);
    const marketOpens = await Promise.all(assets.map(asset => asset.marketOpen()));

    const tx = await factory.transmit(pricePairs, decimals, prices, marketOpens, feedValidator);
    console.log(tx.hash);

    logger.success("All price feeds deployed");
};

func.tags = ["testnet", "oracle-factory"];

export default func;
