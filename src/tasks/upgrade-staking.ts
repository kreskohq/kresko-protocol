import { getLogger } from "@kreskolabs/lib";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_UPGRADE_STAKING } from "./names";

task(TASK_UPGRADE_STAKING)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { deployer } = await hre.getNamedAccounts();
        const logger = getLogger("upgrade:staking", taskArgs.log);

        const [Staking, , deployment] = await hre.deploy("KrStaking", {
            from: deployer,
            log: true,
            proxy: {
                owner: deployer,
                proxyContract: "OptimizedTransparentProxy",
            },
        });
        logger.success("Succesfully upgraded Staking implementation @", deployment.implementation);
        return Staking;
    });
