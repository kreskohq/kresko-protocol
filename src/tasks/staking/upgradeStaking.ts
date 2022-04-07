import { deployWithSignatures, getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { KrStaking } from "types";

task("upgrade:staking")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);
        const { wait, log } = taskArgs;
        const logger = getLogger("upgrade:staking", log);

        const [Staking, , deployment] = await deploy<KrStaking>("KrStaking", {
            from: deployer,
            waitConfirmations: wait,
            log: true,
            proxy: {
                owner: deployer,
                proxyContract: "OptimizedTransparentProxy",
            },
        });
        logger.success("Succesfully upgraded Staking implementation @", deployment.implementation);
        return Staking;
    });
