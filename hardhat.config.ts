import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/clean";

import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });
let mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.log(`No mnemonic set, using default value.`);
    // Just a random word chosen from the BIP 39 list. Not sensitive.
    mnemonic = "wealth";
}

interface Network {
    rpcUrl: string;
    chainId: number;
}

const networks = {
    alfajores: {
        rpcUrl: "https://alfajores-forno.celo-testnet.org",
        chainId: 44787,
    },
    mainnet: {
        rpcUrl: "https://forno.celo.org",
        chainId: 42220,
    },
};

function createTestnetConfig(network: Network): NetworkUserConfig {
    return {
        accounts: {
            count: 10,
            initialIndex: 0,
            mnemonic,
            path: "m/44'/60'/0'/0",
        },
        chainId: network.chainId,
        url: network.rpcUrl,
    };
}

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    gasReporter: {
        currency: "USD",
        enabled: process.env.REPORT_GAS ? true : false,
        excludeContracts: [],
        src: "./contracts",
    },
    networks: {
        hardhat: {
            accounts: {
                mnemonic,
            },
            chainId: 31337,
            initialBaseFeePerGas: 0,
            allowUnlimitedContractSize: true,
            blockGasLimit: 12000000,
        },
        alfajores: createTestnetConfig(networks.alfajores),
        mainnet: createTestnetConfig(networks.mainnet),
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./test",
    },
    solidity: {
        version: "0.8.4",
        settings: {
            metadata: {
                // Not including the metadata hash
                // https://github.com/paulrberg/solidity-template/issues/31
                bytecodeHash: "none",
            },
            // You should disable the optimizer when debugging
            // https://hardhat.org/hardhat-network/#solidity-optimizer-support
            optimizer: {
                enabled: true,
                runs: 800,
            },
        },
    },
    typechain: {
        outDir: "typechain",
        target: "ethers-v5",
    },
    mocha: {
        timeout: 120000,
    },
};

export default config;
