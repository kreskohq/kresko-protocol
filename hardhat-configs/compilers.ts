const oldCompilerSettings = {
    optimizer: {
        enabled: true,
        runs: 800,
    },
    outputSelection: {
        "*": {
            "*": ["storageLayout", "evm.methodIdentifiers", "devdoc", "userdoc", "evm.gasEstimates", "irOptimized"],
            "": ["ast"],
        },
    },
};

export const compilers = {
    compilers: [
        {
            version: "0.5.16",
            ...oldCompilerSettings,
        },
        {
            version: "0.6.6",
            ...oldCompilerSettings,
        },
        {
            version: "0.6.12",
            ...oldCompilerSettings,
        },
        {
            version: "0.8.13",
            optimizer: {
                enabled: true,
                runs: 1500,
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
                        "evm.gasEstimates",
                        "irOptimized",
                    ],
                },
            },
        },
    ],
};
