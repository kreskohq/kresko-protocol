import { getLogger } from "@utils/deployment";
import { fromBig } from "@utils/numbers";
import { DeployFunction } from "hardhat-deploy/types";
import { testnetConfigs } from "src/deploy-config";

const func: DeployFunction = async function (hre) {
    const logger = getLogger("deploy-oracle");
    const { getNamedAccounts } = hre;

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
        logger.log(`Deploying oracle for ${asset.name}`);
        const feed = await hre.run("deployone:fluxpricefeed", {
            name: asset.oracle.name,
            decimals: 8,
            description: asset.oracle.description,
            validator,
        });
        const tx = await feed.transmit(asset.price);
        await tx.wait();
        logger.log(`Oracle deployed for ${asset.name} - initial price: ${fromBig(asset.price, 8)}`);
    }

    logger.success("All price feeds deployed");
};

func.tags = ["auroratest", "auroratest-oracles"];

export default func;
