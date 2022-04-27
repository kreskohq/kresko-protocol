import { deployWithSignatures, getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("upgrade:kresko")
    .addOptionalParam("upgradeFn", "Function to execute after upgrade")
    .addOptionalParam("upgradeArgs", "Specify upgrade function arguments")
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        if (hre.network.name === "hardhat") {
            console.error("Cannot upgrade when network is hardhat");
            return;
        }
        await hre.run("compile");
        const { ethers, deployments, getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { upgradeFn, upgradeArgs, log } = taskArgs;
        const logger = getLogger("upgradeKresko", log);

        const currentKresko = await ethers.getContract<Kresko>("Kresko");
        if (!currentKresko) {
            logger.error("No kresko found in this network");
            return;
        }

        const proxyOwner = await deployments.get("DefaultProxyAdmin");
        const oldImplementation = await deployments.get("Kresko");
        const [Kresko, , deployment] = await deploy<Kresko>("Kresko", {
            from: deployer,
            log: true,
            proxy: {
                owner: deployer,
                proxyContract: "OptimizedTransparentProxy",
                execute: upgradeFn && {
                    methodName: upgradeFn,
                    args: [upgradeArgs.split(",")],
                },
            },
        });

        logger.log(`Succesfully upgraded implementation for Kresko @ ${oldImplementation.implementation}`);
        const contracts = {
            ProxyAdmin: proxyOwner.address,
            [`Kresko (Proxy)`]: Kresko.address,
            [`Kresko (Implementation)`]: deployment.implementation,
        };
        logger.table(contracts);

        hre.kresko = Kresko;
    });
