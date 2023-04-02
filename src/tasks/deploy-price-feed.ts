import { getDeploymentUsers } from "@deploy-config/shared";
import { getLogger } from "@kreskolabs/lib";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_DEPLOY_PRICE_FEED } from "./names";

/**
 * Deploys one flux price feed,
 * Not really used as we use the factory to create these
 */
task(TASK_DEPLOY_PRICE_FEED)
    .addOptionalParam("decimals", "The number of decimals in the value posted", 8, types.int)
    .addParam("deploymentName", "name of the deployment", "FluxPriceFeed", types.string)
    .addParam("description", "The description of the contract")
    .addOptionalParam("validator", "The validator allowed to post data to the contract")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", !process.env.TEST, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { decimals, deploymentName, description, log } = taskArgs;
        const logger = getLogger(TASK_DEPLOY_PRICE_FEED, log);

        const { deployer } = await hre.ethers.getNamedSigners();
        const { admin } = await getDeploymentUsers(hre);

        const validator = hre.ethers.utils.isAddress(taskArgs.validator) ? taskArgs.validator : deployer.address;

        const [PriceFeed] = await hre.deploy("FluxPriceFeed", {
            from: deployer.address,
            deploymentName,
            args: [validator, decimals, description],
        });

        const VALIDATOR_ROLE = await PriceFeed.VALIDATOR_ROLE();
        const hasValidatorRole = await PriceFeed.hasRole(VALIDATOR_ROLE, validator);
        if (!hasValidatorRole) {
            await PriceFeed.connect(admin).grantRole(VALIDATOR_ROLE, validator);
            logger.log("FluxPriceFeed for pair:", description, "deployed at:", PriceFeed.address);
        }

        // TODO: used for local testing with kresko-oracle
        const kreskoOracleAddr = "0xB76982b8e49CEf7dc984c8e2CB87000422aE73bB";
        const kreskoOracleHasValidatorRole = await PriceFeed.hasRole(VALIDATOR_ROLE, kreskoOracleAddr);

        if (!kreskoOracleHasValidatorRole) {
            await PriceFeed.connect(deployer).grantRole(VALIDATOR_ROLE, kreskoOracleAddr);
        }

        return PriceFeed;
    });
