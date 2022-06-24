import { deployWithSignatures, getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("upgrade:krasset")
    .addParam("name", "Name of the KrAsset")
    .addOptionalParam("upgradeFn", "Function to execute after upgrade")
    .addOptionalParam("upgradeArgs", "Specify upgrade function arguments")
    .addOptionalParam("log", "log information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        if (hre.network.name === "hardhat") {
            console.error("Cannot upgrade when network is hardhat");
            return;
        }
        await hre.run("compile");
        const { ethers, krAssets, deployments } = hre;
        const { deployer } = await ethers.getNamedSigners();
        const deploy = deployWithSignatures(hre);

        const { name, upgradeFn, upgradeArgs, log } = taskArgs;
        const logger = getLogger("upgradeKrAsset", log);
        const currentKrAsset = await ethers.getContract<KreskoAsset>(name);
        if (!currentKrAsset) {
            console.error("No KrAsset with", name, "found in this network");
            return;
        }
        const proxyOwner = await deployments.get("DefaultProxyAdmin");
        const oldImplementation = await deployments.get(`${name}_Implementation`);

        const [KreskoAsset, , deployment] = await deploy<KreskoAsset>(name, {
            from: deployer.address,
            log: true,
            contract: "KreskoAsset",
            proxy: {
                owner: proxyOwner.address,
                proxyContract: "OptimizedTransparentProxy",
                execute: upgradeFn && {
                    methodName: upgradeFn,
                    args: upgradeArgs ? [upgradeArgs.split(",")] : [],
                },
            },
        });
        logger.log(`Succesfully upgraded implementation for ${name} @ ${oldImplementation.address}`);
        const contracts = {
            ProxyAdmin: proxyOwner.address,
            [`${name} (Proxy)`]: KreskoAsset.address,
            [`${name} (Implementation)`]: deployment.implementation,
        };
        logger.table(contracts);

        krAssets[name] = KreskoAsset;

        return;
    });
