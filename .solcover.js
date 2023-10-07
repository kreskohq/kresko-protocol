// The environment variables are loaded in hardhat.config.ts
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    throw new Error("No mnemonic set");
}

module.exports = {
    onServerReady: async (config) =>  {
        const result = await hre.deployments.fixture('local');
        if (result.Diamond) {
            hre.Diamond = await hre.getContractOrFork("Kresko");
        }
        throw new Error("You can run this but coverage is not measured. (0% for everything except interfaces).")
    },
    // configureYulOptimizer: true,
    // solcOptimizerDetails: {
    //     orderLiterals: false,  // <-- TRUE! Stack too deep when false
    //     deduplicate: true,
    //     constantOptimizer: false,
    //     yul: true
    // },
    skipFiles: [],
};
