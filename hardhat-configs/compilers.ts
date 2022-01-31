export const compilers = {
    compilers: [
        {
            version: "0.6.6",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 800,
                },
            },
        },
        {
            version: "0.6.12",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 800,
                },
            },
        },
        {
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
        {
            version: "0.8.10",
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
        {
            version: "0.5.16",
            settings: {
                // You should disable the optimizer when debugging
                // https://hardhat.org/hardhat-network/#solidity-optimizer-support
                optimizer: {
                    enabled: true,
                    runs: 800,
                },
            },
        },
    ],
};
