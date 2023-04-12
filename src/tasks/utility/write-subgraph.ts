import { getLogger } from "@kreskolabs/lib";
import { getOutDir } from "@scripts/task-utils";
import { writeFileSync } from "fs";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { TASK_WRITE_SUBGRAPH_JSON } from "../names";
import { ERC20Upgradeable__factory } from "types/typechain";
import { Deployment } from "hardhat-deploy/dist/types";

const logger = getLogger(TASK_WRITE_SUBGRAPH_JSON);

// @ts-expect-error
const commonABIs = [...ERC20Upgradeable__factory.abi.filter(i => i.name).map(i => i.name)] as string[];
type SubgraphExport =
    | {
          deployment?: string;
          artifact?: keyof TC;
          includedABI?: string[];
          excludedABI?: string[];
          outputName?: string;
      }
    | string;

const subgraphExports: SubgraphExport[] = [
    {
        deployment: "Diamond",
        artifact: "Kresko",
        outputName: "Kresko",
    },
    {
        deployment: "krCUBE",
    },
    "KrStaking",
    "KrStakingHelper",
    "FluxPriceFeedFactory",
    {
        artifact: "FluxPriceFeed",
        includedABI: ["NewTransmission"],
    },
    {
        artifact: "KreskoAsset",
        excludedABI: commonABIs,
    },
    {
        artifact: "ERC20Upgradeable",
        outputName: "ERC20",
    },
    "UniswapV2Factory",
    "UniswapV2Router02",
    "UniswapV2Oracle",
    {
        artifact: "UniswapV2Pair",
        excludedABI: commonABIs,
    },
];

task(TASK_WRITE_SUBGRAPH_JSON).setAction(async function (_taskArgs: TaskArguments, hre) {
    const [baseDir, abiDir] = getOutDir("./subgraph", "./subgraph/abis");

    const results: {
        [name: string]: {
            address: string;
            startBlock: number;
        };
    }[] = [];

    for (const item of subgraphExports) {
        const deploymentName = typeof item === "string" ? item : item.deployment;
        const exportABI = typeof item === "string" || !!item.artifact;

        const outputName = typeof item === "string" ? item : item.outputName || item.deployment || item.artifact;
        if ((!deploymentName && !exportABI) || !outputName) {
            throw new Error(`no deployment or ABI export configured: ${JSON.stringify(item)}`);
        }

        // Handle deployment information if configured
        let deployment: Deployment | null = null;

        if (deploymentName) {
            deployment = await hre.getDeploymentOrFork(deploymentName);
            if (!deployment) {
                logger.warn(`deployment not found for: ${deploymentName} - ABI will be exported`);
            } else {
                results.push({
                    [outputName]: {
                        address: deployment.address,
                        startBlock: deployment.receipt?.blockNumber || 0,
                    },
                });
            }
        }
        if (!exportABI) {
            continue;
        }

        // Handle ABI export if configured
        const artifactName = typeof item === "string" ? item : item.artifact!;
        let ABI: any[] | undefined;

        try {
            ABI = hre.artifacts.readArtifactSync(artifactName).abi;
        } catch {
            if (deployment?.abi) {
                logger.warn(`hardhat artifact not found for: ${artifactName} - saving ABI from deployment`);
                ABI = deployment.abi;
            } else {
                logger.error(`not ABI found for: ${artifactName}`);
            }
        }
        if (ABI) {
            if (typeof item !== "string") {
                if (item.includedABI) {
                    ABI = ABI.filter(
                        i => !i.name || item.includedABI!.map(v => v.toLowerCase()).includes(i.name.toLowerCase()),
                    );
                } else if (item.excludedABI) {
                    ABI = ABI.filter(
                        i => !i.name || !item.excludedABI!.map(v => v.toLowerCase()).includes(i.name.toLowerCase()),
                    );
                }
            }
            writeFileSync(`${abiDir}/${outputName}.json`, JSON.stringify(ABI, null, 2));
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
