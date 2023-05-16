import { SolcUserConfig } from "hardhat/types";

const oldCompilerSettings = {
    settings: {
        optimizer: {
            enabled: !process.env.CI,
            runs: 200,
        },
        outputSelection: {
            "*": {
                "*": ["metadata", "evm.methodIdentifiers", "devdoc", "userdoc", "evm.gasEstimates"],
            },
        },
    },
};
export const compilers: SolcUserConfig[] = [
    {
        version: "0.8.20",
        settings: {
            viaIR: !process.env.CI,
            optimizer: {
                enabled: !process.env.CI,
                runs: 2000000,
                details: {
                    constantOptimizer: false,
                    deduplicate: true,
                },
            },
            outputSelection: {
                "*": {
                    "*": [
                        "metadata",
                        "abi",
                        "storageLayout",
                        "evm.methodIdentifiers",
                        "devdoc",
                        "userdoc",
                        "evm.gasEstimates",
                        "evm.byteCode",
                    ],
                },
            },
        },
    },
    {
        version: "0.7.6",
        ...oldCompilerSettings,
    },
    {
        version: "0.6.12",
        ...oldCompilerSettings,
    },
    {
        version: "0.6.6",
        settings: {
            optimizer: {
                enabled: !process.env.CI,
                runs: 200,
            },
        },
    },
    {
        version: "0.5.16",
        settings: {
            optimizer: {
                enabled: !process.env.CI,
                runs: 200,
            },
        },
    },
];
