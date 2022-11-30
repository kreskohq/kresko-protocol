import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { FluxPriceFeed } from "types";
import { testnetConfigs } from "@deploy-config/testnet";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { JStoFixed } from "@kreskolabs/lib";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("deploy-oracle", !process.env.TEST);
    const { getNamedAccounts } = hre;
    const { deployer } = await hre.ethers.getNamedSigners();

    /* -------------------------------------------------------------------------- */
    /*                                  Validator                                 */
    /* -------------------------------------------------------------------------- */
    const { priceFeedValidatorAurora, priceFeedValidatorOpKovan, priceFeedValidatorOpGoerli } =
        await getNamedAccounts();

    let validator = priceFeedValidatorAurora;

    if (hre.network.name === "opkovan") {
        validator = priceFeedValidatorOpKovan;
    } else if (hre.network.name === "opgoerli") {
        validator = priceFeedValidatorOpGoerli;
    } else if (hre.network.name === "hardhat") {
        // Fund validator with exactly 1.0 ether
        validator = "0xB76982b8e49CEf7dc984c8e2CB87000422aE73bB";
        await deployer.sendTransaction({
            to: validator,
            value: hre.ethers.utils.parseEther("1.0"),
        });
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Deployments                                */
    /* -------------------------------------------------------------------------- */

    const assets = [...testnetConfigs[hre.network.name].collaterals, ...testnetConfigs[hre.network.name].krAssets];

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const deployment = await hre.deployments.getOrNull(asset.oracle.name);
        if (deployment != null) {
            logger.log(`Oracle already deployed for ${asset.symbol}`);
            logger.log(`Checking price..`);
            const oracle = await hre.ethers.getContractAt<FluxPriceFeed>(
                "FluxPriceFeed",
                deployment.address,
                validator,
            );

            const marketOpen = await oracle.latestMarketOpen();
            const price = await oracle.latestAnswer();
            if (price.gt(0)) {
                logger.log("Price found, skipping");
                continue;
            } else {
                const price = await asset.price();
                logger.log(`Price not found, transmitting.. ${asset.symbol} - ${price.toString()}`);
                await oracle.transmit(price, marketOpen);
                logger.success(`Price and market status transmitted`);
                continue;
            }
        }
        logger.log(`Deploying oracle for ${asset.symbol}`);
        const feed: FluxPriceFeed = await hre.run("deployone:fluxpricefeed", {
            name: asset.oracle.name,
            decimals: 8,
            description: asset.oracle.description,
            validator,
        });
        const price = await asset.price();
        const marketOpen = await asset.marketOpen();
        await feed.transmit(price, marketOpen, {
            from: deployer.address,
        });
        logger.log(
            `Oracle deployed for ${asset.symbol} - initial price: ${JStoFixed(
                Number(hre.ethers.utils.formatUnits(price, 8)),
                2,
            )}`,
        );
    }

    logger.success("All price feeds deployed");
};

func.skip = async () => true;

// func.skip = async hre => {
//     const assets = [...testnetConfigs[hre.network.name].collaterals, ...testnetConfigs[hre.network.name].krAssets];

//     const lastOracle = assets[assets.length - 1].oracle.name;
//     try {
//         const oracle = await hre.ethers.getContract<FluxPriceFeed>(lastOracle);

//         const price = await oracle.latestAnswer();
//         const marketOpen = await oracle.latestMarketOpen();

//         console.log("last oracle price", price.toString());
//         console.log("last oracle market open", marketOpen.toString());

//         if (price.gt(0)) return true;
//         else return false;
//     } catch {
//         return false;
//     }
// };
func.tags = ["testnet", "oracles"];

export default func;
