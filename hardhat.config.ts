/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment

import type { HardhatUserConfig } from "hardhat/types/config";
import "tsconfig-paths/register";

/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */
import "solidity-coverage";

import "hardhat-diamond-abi";
/// @note comment diamond abi if enabling forge and anvil
import "@typechain/hardhat";

import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

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
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });
let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.log(`No mnemonic set, using default value.`);
    // Just a random word chosen from the BIP 39 list. Not sensitive.
    mnemonic = "wealth";
}

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
    diamondAbi: [
        {
            name: "Kresko",
            include: ["facets/*", "MinterEvent", "AuthEvent"],
            exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking"],
            strict: false,
        },
    ],
    typechain: {
        outDir: "types/forged",
        target: "ethers-v5",
        alwaysGenerateOverloads: true,
        dontOverrideCompile: false,
        discriminateTypes: true,
        tsNocheck: true,
        externalArtifacts: ["./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko.json"],
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
        except: ["vendor"],
    },

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
    verify: { etherscan: { apiKey: process.env.ETHERSCAN_API_KEY } },
};

export default config;
