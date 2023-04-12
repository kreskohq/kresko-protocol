import { getLogger } from "@kreskolabs/lib";
import { getOutDir } from "@scripts/task-utils";
import { writeFileSync } from "fs";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_WRITE_SUBGRAPH_JSON } from "../names";

const logger = getLogger(TASK_WRITE_SUBGRAPH_JSON);

const deploymentNames: (keyof TC | "krCUBE")[] = [
    "Kresko",
    "KISS",
    "krCUBE",
    "KrStaking",
    "KrStakingHelper",
    "FluxPriceFeedFactory",
    "FluxPriceFeed",
    "KreskoAsset",
    "ERC20Upgradeable",
    "UniswapV2Factory",
    "UniswapV2Router02",
    "UniswapV2Oracle",
    "UniswapV2Pair",
];

task(TASK_WRITE_SUBGRAPH_JSON).setAction(async function (_taskArgs: TaskArguments, hre) {
    const [baseDir, abiDir] = getOutDir("./subgraph", "./subgraph/abis");

    const results: {
        [name: string]: {
            address: string;
            startBlock: number;
        };
    }[] = [];

    for (const deploymentName of deploymentNames) {
        const deployment = await hre.getDeploymentOrFork(deploymentName);
        if (deployment) {
            results.push({
                [deploymentName]: {
                    address: deployment.address,
                    startBlock: deployment.receipt?.blockNumber || 0,
                },
            });
        } else {
            logger.warn(`deployment not found for: ${deploymentName} - ABI will be exported`);
        }

        let ABI: any[] | undefined;
        try {
            ABI = hre.artifacts.readArtifactSync(deploymentName).abi;
        } catch {
            logger.warn(`hardhat artifact not found for: ${deploymentName} - saving ABI from deployment`);
            if (deployment) {
                ABI = deployment.abi;
            }
        }
        if (ABI) {
            writeFileSync(`${abiDir}/${deploymentName}.json`, JSON.stringify(ABI, null, 2));
        } else {
            logger.error(`ABI not found for: ${deploymentName}`);
        }
    }
    const output = {
        [hre.network.name === "opgoerli" ? "optimism-goerli" : hre.network.name]: results,
    };

    writeFileSync(`${baseDir}/networks.json`, JSON.stringify(output, null, 2));
    logger.success(`output saved in ${baseDir}`);
});
