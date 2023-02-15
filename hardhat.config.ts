/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment

import type { HardhatUserConfig } from "hardhat/types/config";
import "tsconfig-paths/register";

/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */
import "solidity-coverage";

/// @note comment diamond abi if enabling forge and anvil
import "hardhat-diamond-abi";
import "@typechain/hardhat";

import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

import "@nomiclabs/hardhat-web3";
import "hardhat-watcher";

if (process.env.FOUNDRY === "true") {
    require("@panukresko/hardhat-anvil");
    require("@panukresko/hardhat-forge");
}
require("@nomiclabs/hardhat-etherscan");
import "hardhat-interface-generator";
import "hardhat-contract-sizer";
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

// import { reporters } from "mocha";

/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */

import "./src/tasks";
/* -------------------------------------------------------------------------- */
/*                              Extensions To HRE                             */
/* -------------------------------------------------------------------------- */
import { compilers, networks, users } from "hardhat-configs";
import "hardhat-configs/extensions";

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */
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
        imports: "forge/artifacts",
    },
    external: {
        contracts: [
            {
                artifacts: "./node_modules/@kreskolabs/gnosis-safe-contracts/build/artifacts",
            },
        ],
    },
    typechain: {
        outDir: "types/typechain",
        target: "ethers-v5",
        alwaysGenerateOverloads: true,
        dontOverrideCompile: false,
        discriminateTypes: false,
        tsNocheck: true,
        externalArtifacts: ["artifacts/hardhat-diamond-abi/Kresko.sol/Kresko.json"],
    },
    // gasReporter: {
    //     currency: "USD",
    //     enabled: true,
    //     showMethodSig: true,
    //     src: "./src/contracts",
    // },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        // except: ["vendor"],
    },
    //@ts-ignore
    diamondAbi: [
        {
            name: "Kresko",
            include: ["facets/*"],
            exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking"],
            strict: false,
        },
    ],
    //@ts-ignore
    // foundry: {
    //     cachePath: "forge/cache",
    //     buildInfo: true,
    //     forgeOnly: false,
    //     cacheVacuum: 0,
    // },
    watcher: {
        test: {
            tasks: [{ command: "test", params: { testFiles: ["{path}"] } }],
            files: ["./src/test/**/*"],
            verbose: false,
        },
    },
    //@ts-ignore
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};

export default config;
