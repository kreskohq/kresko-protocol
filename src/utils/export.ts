import { TASK_GENERATE_TYPECHAIN, TASK_WRITE_ORACLE_JSON } from "@tasks";
import { exec } from "child_process";
import { subtask } from "hardhat/config";
import { getFullyQualifiedName } from "hardhat/utils/contract-names";
import type { PublicConfig as RunTypeChainConfig } from "typechain";
export const coreExports = ["Kresko", "Vault", "KreskoAsset", "KreskoAssetAnchor", "KISS", "ERC20Upgradeable", "WETH"];
function getFQNamesFromCompilationOutput(compileSolOutput: any): string[] {
  const allFQNNamesNested = compileSolOutput.artifactsEmittedPerJob.map((a: any) => {
    return a.artifactsEmittedPerFile.map((artifactPerFile: any) => {
      return artifactPerFile.artifactsEmitted.map((artifactName: any) => {
        return getFullyQualifiedName(artifactPerFile.file.sourceName, artifactName);
      });
    });
  });

  return allFQNNamesNested.flat(2);
}
const taskArgsStore = {
  noTypechain: false,
  fullRebuild: false,
};
subtask(TASK_GENERATE_TYPECHAIN, async ({ compileSolOutput, quiet }, { config, artifacts }) => {
  const artifactFQNs: string[] = getFQNamesFromCompilationOutput(compileSolOutput);
  const artifactPaths = Array.from(
    new Set(artifactFQNs.map(fqn => artifacts.formArtifactPathFromFullyQualifiedName(fqn))),
  );

  if (taskArgsStore.noTypechain) {
    return compileSolOutput;
  }

  const typechainCfg = config.typechain;
  if (artifactPaths.length === 0 && !taskArgsStore.fullRebuild && !typechainCfg.externalArtifacts) {
    if (!quiet) {
      // eslint-disable-next-line no-console
      console.log("No need to generate any newer typings.");
    }

    return compileSolOutput;
  }

  // incremental generation is only supported in 'ethers-v5'
  // @todo: probably targets should specify somehow if then support incremental generation this won't work with custom targets
  const needsFullRebuild = taskArgsStore.fullRebuild || typechainCfg.target !== "ethers-v5";
  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(
      `Generating typings for: ${artifactPaths.length} artifacts in dir: ${typechainCfg.outDir} for target: ${typechainCfg.target}`,
    );
  }
  const cwd = config.paths.root;

  const { glob } = await import("typechain");
  const allFiles = glob(cwd, [`${config.paths.artifacts}/!(*).*`]);

  // RUN TYPECHAIN TASK
  if (typechainCfg.externalArtifacts) {
    allFiles.push(...glob(cwd, typechainCfg.externalArtifacts, false));
  }

  const typechainOptions: Omit<RunTypeChainConfig, "filesToProcess"> = {
    cwd,
    allFiles,
    outDir: typechainCfg.outDir,
    target: typechainCfg.target,
    flags: {
      alwaysGenerateOverloads: typechainCfg.alwaysGenerateOverloads,
      discriminateTypes: typechainCfg.discriminateTypes,
      tsNocheck: typechainCfg.tsNocheck,
      environment: "hardhat",
    },
  };

  const { runTypeChain } = await import("typechain");
  const result = await runTypeChain({
    ...typechainOptions,
    filesToProcess: needsFullRebuild ? allFiles : glob(cwd, artifactPaths), // only process changed files if not doing full rebuild
  });

  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(`Successfully generated ${result.filesGenerated} typings!`);
  }

  // if this is not full rebuilding, always re-generate types for external artifacts
  if (!needsFullRebuild && typechainCfg.externalArtifacts) {
    const result = await runTypeChain({
      ...typechainOptions,
      filesToProcess: glob(cwd, typechainCfg.externalArtifacts!, false), // only process files with external artifacts
    });

    if (!quiet) {
      // eslint-disable-next-line no-console
      console.log(`Successfully generated ${result.filesGenerated} typings for external artifacts!`);
    }
  }
});
export const externalArtifacts = () => {
  return [
    "./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Positions.json",
    "./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko.json",
    `./artifacts/!(interfaces|forge|deployments)/**/+(${coreExports.join("|")}).json`,
  ];
};
export const exportDeployments = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      exec("npx hardhat export --export-all packages/contracts/src/deployments.ts", async (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`hh-deploy export: ${stdout}`);
      });
    } catch (e) {
      console.error("exports failed:", e);
      reject(false);
    }
  });
};
