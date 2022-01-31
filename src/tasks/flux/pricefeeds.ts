import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:FluxPriceFeed")
    .addParam("decimals", "The number of decimals in the value posted")
    .addParam("description", "The description of the contract")
    .addOptionalParam("validator", "The validator allowed to post data to the contract")
    .setAction(async function (taskArgs: TaskArguments, { deploy, ethers, priceFeeds }) {
        const { deployer } = await ethers.getNamedSigners();
        const { decimals, description, validator } = taskArgs;

        const [PriceFeed] = await deploy<FluxPriceFeed>("FluxPriceFeed", {
            from: deployer.address,
            args: [validator ? validator : deployer.address, decimals, description],
        });

        console.log("FluxPriceFeed deployed to: ", PriceFeed.address);

        priceFeeds[description] = PriceFeed;
    });
