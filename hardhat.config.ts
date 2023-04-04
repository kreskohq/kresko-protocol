/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment
import { HardhatUserConfig } from "hardhat/config";
import { resolve } from "path";
import "tsconfig-paths/register";
/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */

import "hardhat-diamond-abi";
// note: hardhat-diamond-abi should always be exported before typechain if used together
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";
import "hardhat-interface-generator";
import "solidity-coverage";
import "hardhat-deploy-tenderly";
// import "hardhat-preprocessor";
// import "hardhat-watcher";
// import "hardhat-gas-reporter";

/* -------------------------------------------------------------------------- */
/*                                   Dotenv                                   */
/* -------------------------------------------------------------------------- */
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: resolve(__dirname, "./.env") });
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    throw new Error("No mnemonic set");
}
const isExport = process.env.EXPORT;
let exportUtil: any;

/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */
import "./src/tasks";
/* -------------------------------------------------------------------------- */
/*                                Config helpers                              */
/* -------------------------------------------------------------------------- */
import { compilers, handleForking, networks, users } from "hardhat-configs";
/* -------------------------------------------------------------------------- */
/*                              Extensions To HRE                             */
/* -------------------------------------------------------------------------- */
import "hardhat-configs/extensions";

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

let externalArtifacts = ["./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko.json"];
let outDir = "types/typechain";

if (isExport) {
    console.log("isExport", isExport);
    exportUtil = require("./src/utils/export");
    externalArtifacts = exportUtil.externalArtifacts();
    outDir = "packages/contracts/src/types/";
}

console.log("externalArtifacts", externalArtifacts);

const config: HardhatUserConfig = {
    solidity: { compilers },
    networks: handleForking(networks(mnemonic)),
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
            include: ["facets/*", "MinterEvent", "InterestRateEvent"],
            exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking"],
            strict: false,
        },
    ],
    typechain: {
        outDir,
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
        dontOverrideCompile: false,
        discriminateTypes: true,
        tsNocheck: true,
        externalArtifacts,
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        except: ["vendor"],
    },
    verify: { etherscan: { apiKey: process.env.ETHERSCAN_API_KEY } },
    etherscan: {
        apiKey: {
            optimisticGoerli: process.env.ETHERSCAN_API_KEY!,
        },
    },
    tenderly: {
        project: "synth-protocol",
        username: "kresko",
    },
    // subgraph: {
    //     name: "MySubgraph", // Defaults to the name of the root folder of the hardhat project
    //     product: "hosted-service" | "subgraph-studio", // Defaults to 'subgraph-studio'
    //     indexEvents: true | false, // Defaults to false
    //     allowSimpleName: true | false, // Defaults to `false` if product is `hosted-service` and `true` if product is `subgraph-studio`
    // },
    // watcher: {
    //     test: {
    //         tasks: [{ command: "test", params: { testFiles: ["{path}"] } }],
    //         files: ["./src/test/**/*"],
    //         verbose: false,
    //     },
    // },
    //
    // gasReporter: {
    //     currency: "USD",
    //     enabled: true,
    //     showMethodSig: true,
    //     src: "./src/contracts",
    // },
};

export default config;
