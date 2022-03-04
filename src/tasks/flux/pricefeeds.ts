import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deployone:fluxpricefeed")
    .addOptionalParam("decimals", "The number of decimals in the value posted", 8, types.int)
    .addParam("name", "name of the contract")
    .addParam("description", "The description of the contract")
    .addOptionalParam("validator", "The validator allowed to post data to the contract")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { deploy, getNamedAccounts, priceFeeds } = hre;
        const { deployer } = await getNamedAccounts();

        const { decimals, name, description, validator, wait } = taskArgs;

        const [PriceFeed] = await deploy<FluxPriceFeed>(name, {
            from: deployer,
            contract: "FluxPriceFeed",
            waitConfirmations: wait,
            args: [validator ? validator : deployer, decimals, description],
        });

        const VALIDATOR_ROLE = await PriceFeed.VALIDATOR_ROLE();
        const hasValidatorRole = await PriceFeed.hasRole(VALIDATOR_ROLE, deployer);

        if (!hasValidatorRole) {
            let tx = await PriceFeed.grantRole(VALIDATOR_ROLE, deployer);
            await tx.wait(wait);

            console.log("FluxPriceFeed deployed FOR:", description, "deployed at:", PriceFeed.address);
        }

        await PriceFeed.transmit(toFixedPoint(1));

        priceFeeds[description] = PriceFeed;
        return PriceFeed;
    });
