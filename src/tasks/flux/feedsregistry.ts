import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deployone:feedsregistry")
    .addOptionalParam("admin", "The admin allowed to modify the oracles and minimum update time")
    .setAction(async function (taskArgs: TaskArguments, { ethers, deploy, priceFeedsRegistry }) {
        const { deployer } = await ethers.getNamedSigners();

        const [FeedsRegistry] = await deploy<FeedsRegistry>("FeedsRegistry", {
            from: deployer.address,
            args: [taskArgs.admin ? taskArgs.admin : deployer.address],
        });
        priceFeedsRegistry = FeedsRegistry;
    });
