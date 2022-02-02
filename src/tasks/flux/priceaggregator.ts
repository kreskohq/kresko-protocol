import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:FluxPriceAggregator")
    .addParam("oracles", "Initial oracle addresses, separated by a single comma")
    .addParam("decimals", "The number of decimals in the value posted")
    .addParam("description", "The description of the contract")
    .addOptionalParam("admin", "The admin allowed to modify the oracles and minimum update time")
    .setAction(async function (taskArgs: TaskArguments, { ethers, deploy, priceAggregators }) {
        const { deployer } = await ethers.getNamedSigners();

        const { oracles, decimals, description, admin } = taskArgs;

        let contractAdmin = deployer.address;
        if (admin) {
            contractAdmin = admin;
        }

        // convert oracle addresses to array
        const oraclesArray: string[] = oracles.split(",");

        const [PriceAggregator] = await deploy<FluxPriceAggregator>("FluxPriceAggregator", {
            from: deployer.address,
            args: [contractAdmin, oraclesArray, decimals, description],
        });

        console.log("FluxPriceAggregator deployed to: ", PriceAggregator.address);

        priceAggregators[description] = PriceAggregator;
    });
