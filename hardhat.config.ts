// Deployment
import "tsconfig-paths/register";

// Enable when typechain works seamlessly
// import "@foundry-rs/hardhat";

// OZ Contracts
import "@openzeppelin/hardhat-upgrades";
import "@kreskolabs/hardhat-deploy";
import "@nomiclabs/hardhat-ethers";

// Plugins
// import "solidity-coverage";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "hardhat-diamond-abi";

// import "hardhat-preprocessor";
// import "hardhat-gas-reporter";
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

// HRE extensions
import "hardhat-configs/extensions";

// All tasks
import "hardhat-interface-generator";
import "./src/tasks/diamond/addFacet.ts";
// Get configs
import { compilers, networks, users } from "hardhat-configs";
import type { HardhatUserConfig } from "hardhat/types/config";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// function getRemappings() {
//     return (
//         fs
//             .readFileSync("remappings.txt", "utf8")
//             .split("\n")
//             .filter(Boolean) // remove empty lines
//             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//             // @ts-ignore
//             .map(line => line.trim().split("="))
//     );
// }
// Set config
const config: HardhatUserConfig = {
    // gasReporter: {
    //     currency: "USD",
    //     enabled: process.env.REPORT_GAS ? true : false,
    //     src: "src/contracts",
    // },
    namedAccounts: users,
    networks: networks(mnemonic),
    defaultNetwork: "hardhat",
    paths: {
        artifacts: "build/artifacts",
        cache: "build/cache",
        sources: "src/contracts",
        tests: "src/test/diamond",
        deploy: "src/deploy",
        deployments: "deployments",
        imports: "imports",
    },
    solidity: compilers,
    typechain: {
        outDir: "./types/typechain",
        target: "ethers-v5",
        tsNocheck: true,
        externalArtifacts: ["./build/artifacts/hardhat-diamond-abi/Kresko.sol/Kresko.json"],
    },
    mocha: {
        timeout: 120000,
    },
    diamondAbi: {
        // (required) The name of your Diamond ABI
        name: "Kresko",
        include: ["facets"],
        exclude: ["vendor", "test"],
        strict: true,
    },
};

export default config;
