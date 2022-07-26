import { getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";
import { DeployFunction } from "hardhat-deploy/types";
import { testnetConfigs } from "src/deploy-config";
import { FluxPriceFeed } from "types";
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
        if ((await hre.deployments.getOrNull(asset.oracle.name)) != null) {
            logger.log(`Oracle already deployed for ${asset.name}`);
            continue;
        }
        logger.log(`Deploying oracle for ${asset.name}`);
        const feed: FluxPriceFeed = await hre.run("deployone:fluxpricefeed", {
            name: asset.oracle.name,
            decimals: 8,
            description: asset.oracle.description,
            validator,
        });
        const price = await asset.price();
        console.log(price, asset.symbol);
        await feed.transmit(price, {
            from: deployer.address,
        });
        logger.log(`Oracle deployed for ${asset.name} - initial price: ${fromBig(price, 8)}`);
    }

    logger.success("All price feeds deployed");
};

func.skip = async hre => {
    const assets = [...testnetConfigs[hre.network.name].collaterals, ...testnetConfigs[hre.network.name].krAssets];

    const lastOracle = assets[assets.length - 1].oracle.name;
    try {
        const oracle = await hre.ethers.getContract<FluxPriceFeed>(lastOracle);

        const price = await oracle.latestAnswer();

        console.log("last oracle price", price.toString());

        if (price.gt(0)) return true;
        else return false;
    } catch {
        return false;
    }
};
func.tags = ["testnet", "oracles"];

export default func;
