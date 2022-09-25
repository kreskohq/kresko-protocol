/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment

import "tsconfig-paths/register";
import type { HardhatUserConfig } from "hardhat/types/config";

/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */
// import "solidity-coverage";

/// @note comment diamond abi if enabling forge and anvil
import "hardhat-diamond-abi";
import "@typechain/hardhat";

import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

import "@nomiclabs/hardhat-web3";

if (process.env.FOUNDRY === "true") {
    require("@panukresko/hardhat-anvil");
    require("@panukresko/hardhat-forge");
}

import "hardhat-interface-generator";
// import "hardhat-contract-sizer";
// import "hardhat-preprocessor";
// import "hardhat-watcher";
// import "hardhat-gas-reporter";

/* -------------------------------------------------------------------------- */
/*                                   Dotenv                                   */
/* -------------------------------------------------------------------------- */
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: resolve(__dirname, "./.env") });
let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.log(`No mnemonic set, using default value.`);
    // Just a random word chosen from the BIP 39 list. Not sensitive.
    mnemonic = "wealth";
}

/* -------------------------------------------------------------------------- */
/*                                Config helpers                              */
/* -------------------------------------------------------------------------- */

import { reporters } from "mocha";

/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */

import "src/tasks";
/* -------------------------------------------------------------------------- */
/*                              Extensions To HRE                             */
/* -------------------------------------------------------------------------- */
import "hardhat-configs/extensions";
import { compilers, networks, users } from "hardhat-configs";

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */
const config: HardhatUserConfig = {
    solidity: compilers,
    networks: networks(mnemonic),
    namedAccounts: users,
    mocha: {
        reporter: reporters.Spec,
        timeout: 12000,
    },
    paths: {
        artifacts: "artifacts",
        cache: "cache",
        sources: "src/contracts",
        tests: "src/test",
        deploy: "src/deploy",
        deployments: "deployments",
        imports: "forge/artifacts",
    },
    external: {
        contracts: [
            {
                artifacts: "node_modules/@kreskolabs/gnosis-safe-contracts/build/artifacts",
            },
        ],
    },
    typechain: {
        outDir: "types/typechain",
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
        dontOverrideCompile: false,
        discriminateTypes: false,
        tsNocheck: true,
        externalArtifacts: ["artifacts/hardhat-diamond-abi/Kresko.sol/Kresko.json"],
    },
    // gasReporter: {
    //     currency: "USD",
    //     enabled: false,
    //     src: "src/contracts",
    //     showMethodSig: true,
    //     excludeContracts: ["vendor"],
    // },
    // contractSizer: {
    //     alphaSort: true,
    //     disambiguatePaths: false,
    //     runOnCompile: false,
    //     only: ["Facet", "Diamond", "KreskoAsset"],
    // },
    //@ts-ignore
    diamondAbi: [
        {
            name: "Kresko",
            include: ["facets*"],
            exclude: ["vendor", "test/*", "interfaces/*", "KreskoAsset", "WrappedKreskoAsset", "KrStaking"],
            strict: false,
        },
    ],
    //@ts-ignore
    foundry: {
        cachePath: "forge/cache",
        buildInfo: true,
        forgeOnly: false,
        cacheVacuum: 0,
    },
};

export default config;
