export {};
import { exec } from "child_process";
// import { exec } from "child_process";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { HardhatUserConfig, extendConfig, subtask } from "hardhat/config";
// import { HardhatConfig } from "hardhat/types";
import { getFullyQualifiedName } from "hardhat/utils/contract-names";
import path from "path";
// import minimatch from "minimatch";
// import path from "path";
import type { PublicConfig as RunTypeChainConfig } from "typechain";
export const coreExports = [
    "Kresko",
    "KrStaking",
    "KrStakingHelper",
    "KreskoAsset",
    "KreskoAssetAnchor",
    "UniswapV2Router02",
    "UniswapV2Factory",
    "UniswapMath",
    "UniswapV2Pair",
    "UniswapV2LiquidityMathLibrary",
    "Multisender",
    "FluxPriceFeedFactory",
    "FluxPriceFeed",
    "KISS",
    "Funder",
    "UniswapV2Oracle",
    "ERC20Upgradeable",
    "WETH",
    "wBTC",
];

// // // externalArtifacts: [`/artifacts/!(interfaces|forge|deployments)/**/+(${coreExports.join("|")}).json`],
const currentPath = path.join(process.cwd());
// const lightExports = ["Kresko", "KISS", "KreskoAsset"];

export const externalArtifacts = () => {
    return [
        "./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko.json",
        `./artifacts/!(interfaces|forge|deployments)/**/+(${coreExports.join("|")}).json`,
    ];
};

// extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
//     // We apply our default config here. Any other kind of config resolution
//     // or normalization should be placed here.
//     //
//     // `config` is the resolved config, which will be used during runtime and
//     // you should modify.
//     // `userConfig` is the config as provided by the user. You should not modify
//     // it.
//     //
//     // If you extended the `HardhatConfig` type, you need to make sure that
//     // executing this function ensures that the `config` object is in a valid
//     // state for its type, including its extensions. For example, you may
//     // need to apply a default value, like in this example.
//     const userPath = userConfig.paths?.exclude;

//     // let newPath: string[];
//     // if (userPath === undefined) {
//     //     newPath = path.join(config.paths.root, "exclude");
//     // } else {
//     //     if (path.isAbsolute(userPath)) {
//     //         newPath = userPath;
//     //     } else {
//     //         // We resolve relative paths starting from the project's root.
//     //         // Please keep this convention to avoid confusion.
//     //         newPath = path.normalize(path.join(config.paths.root, userPath));
//     //     }
//     // }

//     config.paths.exclude = userPath || [];
// });
// subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
//     const paths = await runSuper();

//     console.log(paths);
//     return paths.filter((solidityFilePath: string) => {
//         const relativePath = path.relative(config.paths.sources, solidityFilePath);

//         const isExcluded = config.paths.exclude.some((pattern: string) =>
//             minimatch(relativePath, pattern, { nocase: true, matchBase: true }),
//         );
//         if (isExcluded) console.log("excluded...", relativePath, isExcluded);
//         // console.log("running...", relativePath, isExcluded);
//         return !isExcluded;
//     });
// });
// function getFQNamesFromCompilationOutput(compileSolOutput: any): string[] {
//     const allFQNNamesNested = compileSolOutput.artifactsEmittedPerJob.map((a: any) => {
//         return a.artifactsEmittedPerFile.map((artifactPerFile: any) => {
//             return artifactPerFile.artifactsEmitted.map((artifactName: any) => {
//                 return getFullyQualifiedName(artifactPerFile.file.sourceName, artifactName);
//             });
//         });
//     });

//     return allFQNNamesNested.flat(2);
// }
// const taskArgsStore = {
//     noTypechain: false,
//     fullRebuild: false,
// };
// subtask("typechain:generate-types", async ({ compileSolOutput, quiet }, { config, artifacts }) => {
//     const artifactFQNs: string[] = getFQNamesFromCompilationOutput(compileSolOutput);
//     const artifactPaths = Array.from(
//         new Set(artifactFQNs.map(fqn => artifacts.formArtifactPathFromFullyQualifiedName(fqn))),
//     );

//     if (taskArgsStore.noTypechain) {
//         return compileSolOutput;
//     }

//     const typechainCfg = config.typechain;
//     if (artifactPaths.length === 0 && !taskArgsStore.fullRebuild && !typechainCfg.externalArtifacts) {
//         if (!quiet) {
//             // eslint-disable-next-line no-console
//             console.log("No need to generate any newer typings.");
//         }

//         return compileSolOutput;
//     }

//     // incremental generation is only supported in 'ethers-v5'
//     // @todo: probably targets should specify somehow if then support incremental generation this won't work with custom targets
//     const needsFullRebuild = taskArgsStore.fullRebuild || typechainCfg.target !== "ethers-v5";
//     if (!quiet) {
//         // eslint-disable-next-line no-console
//         console.log(
//             `Generating typings for: ${artifactPaths.length} artifacts in dir: ${typechainCfg.outDir} for target: ${typechainCfg.target}`,
//         );
//     }
//     const cwd = config.paths.root;

//     const { glob } = await import("typechain");
//     const allFiles = glob(cwd, [`${config.paths.artifacts}/!(*).*`]);

//     // RUN TYPECHAIN TASK
//     if (typechainCfg.externalArtifacts) {
//         allFiles.push(...glob(cwd, typechainCfg.externalArtifacts, false));
//     }

//     const typechainOptions: Omit<RunTypeChainConfig, "filesToProcess"> = {
//         cwd,
//         allFiles,
//         outDir: typechainCfg.outDir,
//         target: typechainCfg.target,
//         flags: {
//             alwaysGenerateOverloads: typechainCfg.alwaysGenerateOverloads,
//             discriminateTypes: typechainCfg.discriminateTypes,
//             tsNocheck: typechainCfg.tsNocheck,
//             environment: "hardhat",
//         },
//     };

//     const { runTypeChain } = await import("typechain");
//     const result = await runTypeChain({
//         ...typechainOptions,
//         filesToProcess: needsFullRebuild ? allFiles : glob(cwd, artifactPaths), // only process changed files if not doing full rebuild
//     });

//     if (!quiet) {
//         // eslint-disable-next-line no-console
//         console.log(`Successfully generated ${result.filesGenerated} typings!`);
//     }

//     // if this is not full rebuilding, always re-generate types for external artifacts
//     if (!needsFullRebuild && typechainCfg.externalArtifacts) {
//         const result = await runTypeChain({
//             ...typechainOptions,
//             filesToProcess: glob(cwd, typechainCfg.externalArtifacts!, false), // only process files with external artifacts
//         });

//         if (!quiet) {
//             // eslint-disable-next-line no-console
//             console.log(`Successfully generated ${result.filesGenerated} typings for external artifacts!`);
//         }
//     }
// });

// console.log(process.argv[2]);
// console.log();
// const opts = {
//     glob: glob(process.argv[2]),
//     outdir: "packages/contracts/src/typechain",
// };
// "FOUNDRY=true forge build && typechain --input-dir forge/artifacts './forge/artifacts/**/*.json' --out-dir types/forged --target=ethers-v5 --always-generate-overloads --discriminate-types",

//    glob: isExport
//             ? "/**/*+(Facet|Event|Kresko|Staking|KreskoAsset|Router02|V2Factory|V2Pair|V2LiquidityMathLibrary|Multisender|FeedFactory|FluxPriceFeed|KISS|V2Oracle|StakingHelper|ERC20Upgradeable|WETH).*json"
//             : undefined,
// exec(`exp=true pnpm recompile`, (error, stdout, stderr) => {
//     if (error) {
//         console.error(`exec error: ${error}`);
//         return;
//     }
//     console.log(`typechain: ${stdout}`);
//     exec(
//         "npx hardhat export --export-all ./packages/contracts/src/deployments/json/deployments.json",
//         (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`exec error: ${error}`);
//                 return;
//             }
//             console.log(`hh-deploy export: ${stdout}`);

//             exec("npx hardhat write-oracles --network opgoerli", (error, stdout, stderr) => {
//                 if (error) {
//                     console.error(`exec error: ${error}`);
//                     return;
//                 }
//                 console.log(`hh-deploy export: ${stdout}`);
//             });
//         },
//     );
// });
// exec(
//     `npx hardhat typechain -- "${opts.glob}" --out-dir=${opts.outdir} --target=ethers-v5 --always-generate-overloads --discriminate-types`,
//     (error, stdout, stderr) => {
//         if (error) {
//             console.error(`exec error: ${error}`);
//             return;
//         }
//         console.log(`typechain: ${stdout}`);
//         exec(
//             "npx hardhat export --export-all ./packages/contracts/src/deployments/json/deployments.json",
//             (error, stdout, stderr) => {
//                 if (error) {
//                     console.error(`exec error: ${error}`);
//                     return;
//                 }
//                 console.log(`hh-deploy export: ${stdout}`);

//                 exec("npx hardhat write-oracles --network opgoerli", (error, stdout, stderr) => {
//                     if (error) {
//                         console.error(`exec error: ${error}`);
//                         return;
//                     }
//                     console.log(`hh-deploy export: ${stdout}`);
//                 });
//             },
//         );
//     },
// );

export const exportDeployments = async () => {
    return new Promise(async (resolve, reject) => {
        await hre.run("typechain");
        try {
            exec(
                "npx hardhat export --export-all packages/contracts/src/deployments/json/deployments.json",
                async (error, stdout, stderr) => {
                    if (error) {
                        console.error(`exec error: ${error}`);
                        return;
                    }
                    console.log(`hh-deploy export: ${stdout}`);

                    await hre.run("write-oracles");
                    resolve(true);
                    // exec("npx hardhat write-oracles --network opgoerli", (error, stdout, stderr) => {
                    //     if (error) {
                    //         console.error(`exec error: ${error}`);
                    //         return;
                    //     }
                    //     console.log(`hh-deploy export: ${stdout}`);
                    //     resolve(true);
                    // });
                },
            );
        } catch (e) {
            console.error("exports failed:", e);
            reject(false);
        }
    });
};
// exec("typechain", [
//     "--fork",
//     options.fork.url,
//     "--mnemonic",
//     options.wallet.mnemonic!,
//     "--defaultBalanceEther",
//     options.wallet.defaultBalance.toString(),
//     "--unlock",
//     options.wallet.unlockedAccounts.join(","),
//     "--allowUnlimitedContractSize",
//     "--gasPrice",
//     options.miner.defaultGasPrice.toString(),
//     "--port",
//     op
