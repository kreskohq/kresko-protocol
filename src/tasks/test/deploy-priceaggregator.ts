import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("test:deployone:fluxpriceaggregator")
    .addParam("oracles", "Initial oracle addresses, separated by a single comma")
    .addParam("decimals", "The number of decimals in the value posted")
    .addParam("description", "The description of the contract")
    .addOptionalParam("admin", "The admin allowed to modify the oracles and minimum update time")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, { ethers, deploy }) {
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
        return PriceAggregator
    });
