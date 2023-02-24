import { assets as goerliAssets, testnetConfigs } from "@deploy-config/testnet-goerli";
import { getLogger } from "@kreskolabs/lib";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
    const { deployer } = await hre.ethers.getNamedSigners();
    const feedValidator = new hre.ethers.Wallet(process.env.FEED_VALIDATOR_PK!).connect(hre.ethers.provider);
    if (hre.network.name === "hardhat" && (await hre.ethers.provider.getBalance(feedValidator.address)).eq(0)) {
        await deployer.sendTransaction({
            to: feedValidator.address,
            value: hre.ethers.utils.parseEther("10"),
        });
    }
    const [factory] = await hre.deploy("FluxPriceFeedFactory", {
        from: feedValidator.address,
    });
    const assets = [
        ...testnetConfigs[hre.network.name].collaterals,
        ...testnetConfigs[hre.network.name].krAssets,
        goerliAssets.KISS,
    ];
    const logger = getLogger("create-oracle-factory");
    const pricePairs = assets.map(asset => asset.oracle!.description);
    const prices = await Promise.all(assets.map(asset => asset.price!()));

    const decimals = assets.map(() => 8);

    const marketOpens = await Promise.all(assets.map(asset => asset.marketOpen!()));
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
