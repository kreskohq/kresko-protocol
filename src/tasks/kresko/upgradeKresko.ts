import { deployWithSignatures } from "@utils/deployment";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("upgrade:kresko")
    .addOptionalParam("upgradeFn", "Function to execute after upgrade")
    .addOptionalParam("upgradeArgs", "Specify upgrade function arguments")
    .setAction(async function (taskArgs: TaskArguments, hre) {
        if (hre.network.name === "hardhat") {
            console.error("Cannot upgrade when network is hardhat");
            return;
        }
        await hre.run("compile");
        const { ethers, deployments, getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { upgradeFn, upgradeArgs } = taskArgs;

        const currentKresko = await ethers.getContract<Kresko>("Kresko");
        if (!currentKresko) {
            console.error("No kresko found in this network");
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

        console.log(`Succesfully upgraded implementation for Kresko @ ${oldImplementation.implementation}`);
        const contracts = {
            ProxyAdmin: proxyOwner.address,
            [`Kresko (Proxy)`]: Kresko.address,
            [`Kresko (Implementation)`]: deployment.implementation,
        };
        console.table(contracts);

        hre.kresko = Kresko;
    });
