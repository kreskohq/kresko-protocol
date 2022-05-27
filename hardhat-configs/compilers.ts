const generalSettings = {
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
            ...generalSettings,
        },
        {
            version: "0.6.6",
            ...generalSettings,
        },
        {
            version: "0.6.12",
            ...generalSettings,
        },
        {
            version: "0.8.4",
            settings: {
                ...generalSettings,
                metadata: {
                    // Not including the metadata hash
                    // https://github.com/paulrberg/solidity-template/issues/31
                    bytecodeHash: "none",
                },
            },
        },
        {
            version: "0.8.11",
            ...generalSettings,
            metadata: {
                // Not including the metadata hash
                // https://github.com/paulrberg/solidity-template/issues/31
                bytecodeHash: "none",
            },
        },
    ],
};
