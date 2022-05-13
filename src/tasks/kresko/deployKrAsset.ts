import { deployWithSignatures, getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:krasset")
    .addParam("name", "Name of the asset")
    .addParam("symbol", "Symbol for the asset")
    .addOptionalParam("owner", "Specify a different owner than deployer")
    .addOptionalParam("operator", "Operator of the asset")
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { krAssets, getNamedAccounts, deployments } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { name, symbol, owner, operator, log, wait } = taskArgs;
        const logger = getLogger("deployKrAsset", log);

        const contractOwner = owner ? owner : deployer;
        let contractOperator: string;

        if (hre.network.name === "hardhat" && !operator) {
            contractOperator = deployer;
        } else {
            contractOperator = operator ? operator : (await deployments.get("Kresko")).address;
        }

        logger.log("Asset operator is", contractOperator);

        const [KreskoAsset, , deployment] = await deploy<KreskoAsset>(symbol, {
            from: deployer,
            log,
            contract: "KreskoAsset",
            proxy: {
                owner: deployer,
                proxyContract: "OptimizedTransparentProxy",
                execute: {
                    methodName: "initialize",
                    args: [name, symbol, contractOwner, contractOperator],
                },
            },
        });

        const ProxyAdmin = await deployments.get("DefaultProxyAdmin");

        const contracts = {
            ProxyAdmin: ProxyAdmin.address,
            [`${name} (Proxy)`]: KreskoAsset.address,
            [`${name} Implementation`]: deployment.implementation,
            txHash: deployment.transactionHash,
        };
        logger.table(contracts);
        logger.success("KrAsset succesfully deployed @ ", KreskoAsset.address);

        krAssets[name] = KreskoAsset;
    });
