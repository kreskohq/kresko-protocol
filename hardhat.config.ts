// Deployment

import "tsconfig-paths/register";

// Plugins
// @audit Enabled when typechain works seamlessly

// import "solidity-coverage";
import "hardhat-diamond-abi";
// import "@foundry-rs/hardhat/packages/hardhat-forge/src/forge/build/index";
import "@typechain/hardhat";
import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-web3";
import "hardhat-interface-generator";
import "hardhat-contract-sizer";
// import "hardhat-preprocessor";
import "hardhat-watcher";
import "hardhat-gas-reporter";

// Environment variables
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: resolve(__dirname, "./.env") });
let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.log(`No mnemonic set, using default value.`);
    // Just a random word chosen from the BIP 39 list. Not sensitive.
    mnemonic = "wealth";
}

import "hardhat-configs/extensions";

// Custom extensions

// Tasks
import "./src/tasks/diamond/addFacet.ts";
// Configurations
import { compilers, networks, users } from "hardhat-configs";
import { reporters } from "mocha";

import type { HardhatUserConfig } from "hardhat/types/config";
// Set config
const config: HardhatUserConfig = {
    mocha: {
        reporter: reporters.Spec,
        timeout: 12000,
    },
    gasReporter: {
        currency: "USD",
        enabled: false,
        src: "src/contracts",
        showMethodSig: true,
        excludeContracts: ["vendor"],
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: false,
        only: ["Facet", "Diamond", "KreskoAsset"],
    },
    namedAccounts: users,
    networks: networks(mnemonic),
    defaultNetwork: "hardhat",
    paths: {
        artifacts: "build/artifacts",
        cache: "build/cache",
        sources: "src/contracts",
        tests: "src/test",
        deploy: "src/deploy",
        deployments: "deployments",
    },
    solidity: compilers,
    external: {
        contracts: [
            {
                artifacts: "node_modules/@kreskolabs/gnosis-safe-contracts/build/artifacts",
            },
        ],
    },
    diamondAbi: [
        {
            name: "Kresko",
            include: ["facets/*"],
            exclude: ["vendor", "test/*", "interfaces/*", "KreskoAsset"],
            strict: true,
        },
    ],
    typechain: {
        outDir: "types/typechain",
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
        dontOverrideCompile: false,
        discriminateTypes: false,
        tsNocheck: false,
        externalArtifacts: ["build/artifacts/hardhat-diamond-abi/Kresko.sol/Kresko.json"],
    },
};

export default config;
