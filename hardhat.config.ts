import fs from "fs";
// Deployment
import "tsconfig-paths/register";
import "@kreskolabs/hardhat-deploy";

// HRE extensions
import "@configs/extensions";

// Enable when typechain works seamlessly
// import "@foundry-rs/hardhat";

// OZ Contracts
import "@openzeppelin/hardhat-upgrades";

// Plugins
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-solhint";

import "hardhat-gas-reporter";
import "hardhat-preprocessor";
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
// Get configs
import { compilers, networks, users } from "@configs";
import type { HardhatUserConfig } from "hardhat/types";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function getRemappings() {
    return (
        fs
            .readFileSync("remappings.txt", "utf8")
            .split("\n")
            .filter(Boolean) // remove empty lines
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .map(line => line.trim().split("="))
    );
}
// Set config
const config: HardhatUserConfig = {
    gasReporter: {
        currency: "USD",
        enabled: process.env.REPORT_GAS ? true : false,
        src: "./src/contracts",
    },
    namedAccounts: users,
    networks: networks(mnemonic),
    defaultNetwork: "hardhat",
    preprocess: {
        eachLine: () => ({
            transform: (line: string) => {
                if (line.match(/^\s*import /i)) {
                    getRemappings().forEach(([find, replace]) => {
                        if (line.match('"' + find)) {
                            line = line.replace('"' + find, '"' + replace);
                        }
                    });
                }
                return line;
            },
        }),
    },
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
        externalArtifacts: fs.existsSync("./deployments/localhost/Diamond.json")
            ? [
                  fs.existsSync("./deployments/auroratest/Diamond.json")
                      ? "./deployments/localhost/Diamond.json"
                      : "./deployments/auroratest/Diamond.json",
              ]
            : ["./abi/DiamondBase.json"],
    },
    mocha: {
        timeout: 120000,
    },
};

export default config;
