const shell = require("shelljs");

// The environment variables are loaded in hardhat.config.ts
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    throw new Error("No mnemonic set");
}

module.exports = { 
    // onCompileComplete: async function (_config) {
    //     console.log(hre.network)
    //     // const result = await hre.deployments.fixture(['minter-test']);

    //     // if (result.Diamond) {
    //     //     hre.Diamond = await hre.getContractOrFork("Kresko");
    //     // }
    //     //   await hre.deployments.fixture(['local'], {
    //     //     keepExistingDeployments: true, // by default reuse the existing deployments (useful for fork testing)
    //     //   });
    // },
    // configureYulOptimizer: true,
    // solcOptimizerDetails: {
    //     orderLiterals: false,  // <-- TRUE! Stack too deep when false
    //     deduplicate: true,
    //     constantOptimizer: false,
    //     yul: true
    // },
    skipFiles: [],
};
