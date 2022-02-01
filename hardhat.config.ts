// Deployment
import "tsconfig-paths/register";

import "@nomiclabs/hardhat-web3";
import "hardhat-deploy";

// HRE extensions
import "@configs/extensions";

// OZ Contracts
import "@openzeppelin/hardhat-upgrades";

// Plugins
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "solidity-coverage";

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

// All tasks
import "@tasks";

// Configurations
import { compilers, networks, users } from "@configs";

// Config

export default {
    defaultNetwork: "hardhat",
    gasReporter: {
        currency: "USD",
        enabled: process.env.REPORT_GAS ? true : false,
        excludeContracts: [],
        src: "./src/contracts",
    },
    namedAccounts: users,
    networks: networks(mnemonic),
    paths: {
        artifacts: "./build/artifacts",
        cache: "./build/cache",
        sources: "./src/contracts",
        tests: "./src/test",
        deploy: "./src/deploy",
        deployments: "./deployments",
        imports: "./imports",
    },
    solidity: compilers,
    typechain: {
        outDir: "./types/contracts",
        target: "ethers-v5",
    },
};
