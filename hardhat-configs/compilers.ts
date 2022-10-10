const oldCompilerSettings = {
    optimizer: {
        enabled: true,
        runs: 800,
    },
    outputSelection: {
        "*": {
            "*": ["storageLayout", "evm.methodIdentifiers", "devdoc", "userdoc", "evm.gasEstimates"],
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
        {
            version: "0.6.12",
            ...oldCompilerSettings,
        },
        {
            version: "0.6.6",
            ...oldCompilerSettings,
        },
        {
            version: "0.5.16",
            ...oldCompilerSettings,
        },
    ],
};
