import { getLogger } from "@kreskolabs/lib";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { getUsers } from "@utils/general";

task("deployone:fluxpricefeed")
    .addOptionalParam("decimals", "The number of decimals in the value posted", 8, types.int)
    .addParam("deploymentName", "name of the deployment", "FluxPriceFeed", types.string)
    .addParam("description", "The description of the contract")
    .addOptionalParam("validator", "The validator allowed to post data to the contract")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", !process.env.TEST, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { deploy, getNamedAccounts } = hre;
        const { admin, deployer } = await getNamedAccounts();
        const users = await getUsers();

        const { decimals, deploymentName, description, validator, log } = taskArgs;
        const logger = getLogger("deployone:fluxpricefeed", log);

        const [PriceFeed] = await deploy("FluxPriceFeed", {
            from: admin,
            deploymentName,
            args: [validator ? validator : deployer, decimals, description],
        });

        const VALIDATOR_ROLE = await PriceFeed.VALIDATOR_ROLE();
        const hasValidatorRole = await PriceFeed.hasRole(VALIDATOR_ROLE, admin);
        if (!hasValidatorRole) {
            await PriceFeed.connect(users.admin).grantRole(VALIDATOR_ROLE, deployer);
            logger.log("FluxPriceFeed for pair:", description, "deployed at:", PriceFeed.address);
        }

        // TODO: used for local testing with kresko-oracle
        const kreskoOracleAddr = "0xB76982b8e49CEf7dc984c8e2CB87000422aE73bB";
        const kreskoOracleHasValidatorRole = await PriceFeed.hasRole(VALIDATOR_ROLE, kreskoOracleAddr);
        if (!kreskoOracleHasValidatorRole) {
            await PriceFeed.connect(users.admin).grantRole(VALIDATOR_ROLE, kreskoOracleAddr);
        }

        return PriceFeed;
    });
