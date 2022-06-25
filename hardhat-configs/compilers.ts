const defaultCompilerOptions = {
    optimizer: {
        enabled: true,
        runs: 800,
    },
    outputSelection: {
        "*": {
            "*": [
                "storageLayout",
                "evm.methodIdentifiers",
                "devdoc",
                "userdoc",
                "evm.gasEstimates",
                "evm.bytecode",
                "metadata",
                "abi",
            ],
            "": ["ast"],
        },
    },
};

export const compilers = {
    compilers: [
        {
            version: "0.8.14",
            optimizer: {
                enabled: true,
                runs: 800,
                details: {
                    yul: true,
                    yulDetails: {
                        stackAllocation: true,
                    },
                },
            },
            viaIR: true,
            outputSelection: {
                "*": {
                    "*": [
                        "storageLayout",
                        "evm.methodIdentifiers",
                        "devdoc",
                        "userdoc",
                        "abi",
                        "evm.gasEstimates",
                        "irOptimized",
                        "evm.bytecode",
                        "evm.bytecode.object",
                        "metadata",
                    ],
                },
            },
        },
        {
            version: "0.6.12",
            ...defaultCompilerOptions,
        },
    ],
};
