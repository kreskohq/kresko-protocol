import { getLogger } from "@kreskolabs/lib";
import { getOutDir } from "@scripts/task-utils";
import { writeFileSync } from "fs";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_WRITE_SUBGRAPH_JSON } from "../names";

const logger = getLogger(TASK_WRITE_SUBGRAPH_JSON);

const deploymentNames: (keyof TC | "krCUBE")[] = [
    "Kresko",
    "UniswapV2Factory",
    "KISS",
    "krCUBE",
    "KrStaking",
    "KrStakingHelper",
    "FluxPriceFeedFactory",
    "UniswapV2Oracle",
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
        if (!deployment) continue;

        results.push({
            [deploymentName]: {
                address: deployment.address,
                startBlock: deployment.receipt?.blockNumber || 0,
            },
        });

        let ABI: any[];
        try {
            ABI = hre.artifacts.readArtifactSync(deploymentName).abi;
        } catch {
            logger.warn(`hardhat artifact not found for: ${deploymentName} - saving ABI from the deployment`);
            ABI = deployment.abi;
        }

        writeFileSync(`${abiDir}/${deploymentName}.json`, JSON.stringify(ABI, null, 2));
    }
    const output = {
        [hre.network.name === "opgoerli" ? "optimism-goerli" : hre.network.name]: results,
    };

    writeFileSync(`${baseDir}/networks.json`, JSON.stringify(output, null, 2));
    logger.success(`output saved in ${baseDir}`);
});
