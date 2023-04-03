import { assets as goerliAssets, testnetConfigs } from "@deploy-config/opgoerli";
import { getLogger } from "@kreskolabs/lib";
import type { DeployFunction } from "hardhat-deploy/types";

const logger = getLogger("create-oracle-factory");

const deploy: DeployFunction = async function (hre) {
    const { deployer } = await hre.ethers.getNamedSigners();
    const feedValidator = new hre.ethers.Wallet(process.env.FEED_VALIDATOR_PK!).connect(hre.ethers.provider);
    if (hre.network.name === "hardhat" && (await hre.ethers.provider.getBalance(feedValidator.address)).eq(0)) {
        await deployer.sendTransaction({
            to: feedValidator.address,
            value: hre.ethers.utils.parseEther("10"),
        });
    }
    if (hre.network.live) {
        throw new Error("Trying to use local deployment script on live network.");
    }

    const [factory] = await hre.deploy("FluxPriceFeedFactory", {
        from: feedValidator.address,
    });

    const assets = [
        ...testnetConfigs[hre.network.name].collaterals,
        ...testnetConfigs[hre.network.name].krAssets,
        goerliAssets.KISS,
    ];

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

deploy.tags = ["local", "oracles"];
deploy.skip = async hre => hre.network.live;

export default deploy;