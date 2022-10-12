import { getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deployone:fluxpricefeed")
    .addOptionalParam("decimals", "The number of decimals in the value posted", 8, types.int)
    .addParam("name", "name of the contract")
    .addParam("description", "The description of the contract")
    .addOptionalParam("validator", "The validator allowed to post data to the contract")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { deploy, getNamedAccounts, priceFeeds } = hre;
        const { deployer } = await getNamedAccounts();

        const { decimals, name, description, validator, log } = taskArgs;
        const logger = getLogger("deployone:fluxpricefeed", log);

        const [PriceFeed] = await deploy<FluxPriceFeed>(name, {
            from: deployer,
            contract: "FluxPriceFeed",
            args: [validator ? validator : deployer, decimals, description],
        });

        const VALIDATOR_ROLE = await PriceFeed.VALIDATOR_ROLE();
        const hasValidatorRole = await PriceFeed.hasRole(VALIDATOR_ROLE, deployer);

        if (!hasValidatorRole) {
            await PriceFeed.grantRole(VALIDATOR_ROLE, deployer);
            logger.log("FluxPriceFeed for pair:", description, "deployed at:", PriceFeed.address);
        }

        priceFeeds[description] = PriceFeed;
        return PriceFeed;
    });
