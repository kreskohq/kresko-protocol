import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { FluxPriceFeed } from "types";
import { getLogger } from "@utils/deployment";
import { JStoFixed } from "@utils/fixed-point";
import { testnetConfigs } from "src/config/deployment";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("deploy-oracle");
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
            const price = await oracle.latestAnswer();
            if (price.gt(0)) {
                logger.log("Price found, skipping");
                continue;
            } else {
                const price = await asset.price();
                logger.log(`Price not found, transmitting.. ${asset.symbol} - ${price.toString()}`);
                await oracle.transmit(price);
                logger.success(`Price transmitted`);
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
        await feed.transmit(price, {
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

// func.skip = async hre => {
//     const assets = [...testnetConfigs[hre.network.name].collaterals, ...testnetConfigs[hre.network.name].krAssets];

//     const lastOracle = assets[assets.length - 1].oracle.name;
//     try {
//         const oracle = await hre.ethers.getContract<FluxPriceFeed>(lastOracle);

//         const price = await oracle.latestAnswer();

//         console.log("last oracle price", price.toString());

//         if (price.gt(0)) return true;
//         else return false;
//     } catch {
//         return false;
//     }
// };
func.tags = ["minter-test", "testnet", "oracles"];

export default func;
