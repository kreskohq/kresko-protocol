/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment

import "tsconfig-paths/register";
/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */
import "solidity-coverage";

/// @note comment diamond abi if enabling forge and anvil
import "hardhat-diamond-abi";
import "@typechain/hardhat";

import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy-ethers";
import "hardhat-deploy";

import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";
import "hardhat-interface-generator";
import "hardhat-watcher";

if (process.env.FOUNDRY === "true") {
    require("@panukresko/hardhat-anvil");
    require("@panukresko/hardhat-forge");
}
require("@nomiclabs/hardhat-etherscan");
// import "hardhat-preprocessor";
// import "hardhat-watcher";
// import "hardhat-gas-reporter";

/* -------------------------------------------------------------------------- */
/*                                   Dotenv                                   */
/* -------------------------------------------------------------------------- */
import { config as dotenvConfig } from "dotenv";
import path, { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });
let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.log(`No mnemonic set, using default value.`);
    // Just a random word chosen from the BIP 39 list. Not sensitive.
    mnemonic = "wealth";
}
const isExport = process.argv[2] === "export";
/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */
import "./src/tasks";
/* -------------------------------------------------------------------------- */
/*                                Config helpers                              */
/* -------------------------------------------------------------------------- */
import { compilers, networks, users } from "hardhat-configs";
/* -------------------------------------------------------------------------- */
/*                              Extensions To HRE                             */
/* -------------------------------------------------------------------------- */
import "hardhat-configs/extensions";

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

import { extendConfig, HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { minimatch } from "minimatch";
import { HardhatConfig } from "hardhat/types";

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    // We apply our default config here. Any other kind of config resolution
    // or normalization should be placed here.
    //
    // `config` is the resolved config, which will be used during runtime and
    // you should modify.
    // `userConfig` is the config as provided by the user. You should not modify
    // it.
    //
    // If you extended the `HardhatConfig` type, you need to make sure that
    // executing this function ensures that the `config` object is in a valid
    // state for its type, including its extensions. For example, you may
    // need to apply a default value, like in this example.
    const userPath = userConfig.paths?.exclude;

    // let newPath: string[];
    // if (userPath === undefined) {
    //     newPath = path.join(config.paths.root, "exclude");
    // } else {
    //     if (path.isAbsolute(userPath)) {
    //         newPath = userPath;
    //     } else {
    //         // We resolve relative paths starting from the project's root.
    //         // Please keep this convention to avoid confusion.
    //         newPath = path.normalize(path.join(config.paths.root, userPath));
    //     }
    // }

    config.paths.exclude = userPath || [];
});

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
    const paths = await runSuper();
    return paths.filter((solidityFilePath: string) => {
        const relativePath = path.relative(config.paths.sources, solidityFilePath);

        const isExcluded = config.paths.exclude.some((pattern: string) =>
            minimatch(relativePath, pattern, { nocase: true, matchBase: true }),
        );
        if (isExcluded) console.log("excluded...", relativePath, isExcluded);
        // console.log("running...", relativePath, isExcluded);
        return !isExcluded;
    });
});
const config: HardhatUserConfig = {
    solidity: { compilers },
    networks: networks(mnemonic),
    namedAccounts: users,
    mocha: {
        reporter: "mochawesome",
        timeout: process.env.CI ? 45000 : 15000,
    },
    paths: {
        artifacts: "artifacts",
        cache: "cache",
        sources: "src/contracts",
        tests: "src/test",
        deploy: "src/deploy",
        deployments: "deployments",
        // imports: "forge/artifacts",
        exclude: isExport
            ? ["*GnosisSafe+(*).sol", "**/interfaces/*.sol", "*Smock*", "*FeedsRegistry*", "*Aggregator*"]
            : undefined,
    },
    external: {
        contracts: isExport
            ? []
            : [
                  {
                      artifacts: "./node_modules/@kreskolabs/gnosis-safe-contracts/build/artifacts",
                  },
              ],
    },
    diamondAbi: [
        {
            name: "Kresko",
            include: ["facets/*", "MinterEvent", "InterestRateEvent"],
            exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking"],
            strict: false,
        },
    ],
    typechain: {
        outDir: isExport ? "packages/contracts/typechain" : "types/typechain",
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
        dontOverrideCompile: false,
        discriminateTypes: false,
        tsNocheck: true,
        externalArtifacts: ["./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko.json"],
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        except: ["vendor"],
    },
    watcher: {
        test: {
            tasks: [{ command: "test", params: { testFiles: ["{path}"] } }],
            files: ["./src/test/**/*"],
            verbose: false,
        },
    },
    verify: { etherscan: { apiKey: process.env.ETHERSCAN_API_KEY } },
    // gasReporter: {
    //     currency: "USD",
    //     enabled: true,
    //     showMethodSig: true,
    //     src: "./src/contracts",
    // },
    //   //@ts-ignore
    // foundry: {
    //     cachePath: "forge/cache",
    //     buildInfo: true,
    //     forgeOnly: false,
    //     cacheVacuum: 0,
    // },
};

export default config;
