const oldCompilerSettings = {
    optimizer: {
        enabled: true,
        runs: 800,
    },
    outputSelection: {
        "*": {
            "*": ["storageLayout"],
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
                runs: 800,
                details: {
                    yul: true,
                    yulDetails: {
                        stackAllocation: true,
                    },
                },
            },
            outputSelection: {
                "*": {
                    "*": ["storageLayout"],
                },
            },
        },
    ],
};
