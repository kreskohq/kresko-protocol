/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment
import { HardhatUserConfig } from "hardhat/config";
import { resolve } from "path";
import "tsconfig-paths/register";
/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */
// import "solidity-coverage";

/// @note comment diamond abi if enabling forge and anvil
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-diamond-abi";
import "hardhat-packager";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";
import "hardhat-interface-generator";
// import "hardhat-watcher";

require("@nomiclabs/hardhat-etherscan");

export const coreExports = [
    "Kresko",
    "KrStaking",
    "KrStakingHelper",
    "KreskoAsset",
    "KreskoAssetAnchor",
    "UniswapV2Router02",
    "UniswapV2Factory",
    "UniswapMath",
    "UniswapV2Pair",
    "UniswapV2LiquidityMathLibrary",
    "Multisender",
    "FluxPriceFeedFactory",
    "FluxPriceFeed",
    "KISS",
    "UniswapV2Oracle",
    "ERC20Upgradeable",
    "WETH",
];

// import "hardhat-preprocessor";
// import "hardhat-watcher";
// import "hardhat-gas-reporter";

/* -------------------------------------------------------------------------- */
/*                                   Dotenv                                   */
/* -------------------------------------------------------------------------- */
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: resolve(__dirname, "./.env") });
let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.log(`No mnemonic set, using default value.`);
    // Just a random word chosen from the BIP 39 list. Not sensitive.
    mnemonic = "wealth";
}
const isExport = process.env.exp;
let exportUtil: any;

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
        // imports: "forge/artifacts",
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
        outDir: isExport ? "packages/contracts/src/types/" : "types/typechain",
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
        dontOverrideCompile: false,
        discriminateTypes: true,
        tsNocheck: true,
        externalArtifacts: exportUtil?.externalArtifacts() ?? [
            "./artifacts/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko.json",
        ],
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        except: ["vendor"],
    },
    // watcher: {
    //     test: {
    //         tasks: [{ command: "test", params: { testFiles: ["{path}"] } }],
    //         files: ["./src/test/**/*"],
    //         verbose: false,
    //     },
    // },
    verify: { etherscan: { apiKey: process.env.ETHERSCAN_API_KEY } },
    etherscan: {
        apiKey: {
            optimisticGoerli: process.env.ETHERSCAN_API_KEY!,
        },
    },
    //
    // gasReporter: {
    //     currency: "USD",
    //     enabled: true,
    //     showMethodSig: true,
    //     src: "./src/contracts",
    // },
};

export default config;
