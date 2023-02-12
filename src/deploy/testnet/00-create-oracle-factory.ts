import { assets as goerliAssets, testnetConfigs } from "@deploy-config/testnet-goerli";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import type { FluxPriceFeedFactory } from "types";

const func: DeployFunction = async function (hre) {
    const { feedValidator } = await hre.ethers.getNamedSigners();
    const [factory] = await hre.deploy<FluxPriceFeedFactory>("FluxPriceFeedFactory", {
        from: feedValidator.address,
    });
    const assets = [
        ...testnetConfigs[hre.network.name].collaterals,
        ...testnetConfigs[hre.network.name].krAssets,
        goerliAssets.KISS,
    ];
    const logger = getLogger("create-oracle-factory");
    const pricePairs = assets.map(asset => asset.oracle.description);
    const prices = await Promise.all(assets.map(asset => asset.price()));
    const decimals = assets.map(() => 8);
    const marketOpens = await Promise.all(assets.map(asset => asset.marketOpen()));
    await factory
        .connect(feedValidator)
        .transmit(
            pricePairs.slice(0, 6),
            decimals.slice(0, 6),
            prices.slice(0, 6),
            marketOpens.slice(0, 6),
            feedValidator.address,
        );
    await factory
        .connect(feedValidator)
        .transmit(pricePairs.slice(6), decimals.slice(6), prices.slice(6), marketOpens.slice(6), feedValidator.address);
    logger.success("All price feeds deployed");
};

func.tags = ["testnet", "oracles"];

export default func;
