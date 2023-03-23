import { batchBStakingPools, testnetConfigs } from "@deploy-config/testnet-goerli";

async function run() {
    const Factory = await hre.getContractOrFork("UniswapV2Factory");

    const krUSO = await hre.ethers.getContractAt("KreskoAsset", "0x93E9868Fe8af48c61Bb7CF0c84Dd80E911655EB3");
    const krAAPL = await hre.ethers.getContractAt("KreskoAsset", "0x1D9eF6beb94BF8658F1a62dcE81b986EE68E7585");
    const krIAU = await hre.ethers.getContractAt("KreskoAsset", "0x1AA01a7352C9365FC017dad2e00d159e9E8040f7");
    const krCOIN = await hre.ethers.getContractAt("KreskoAsset", "0x4186795CE91a75127eEd5d7511023B88878811B8");
    const krAMC = await hre.ethers.getContractAt("KreskoAsset", "0xB20c79fEaFc5734f440021ddb95ebbda7DafE622");
    const KISS = await hre.getContractOrFork("KISS");
    try {
        const krUSOKISS = await Factory.createPair(krUSO.address, KISS.address);
        console.log("krUSO-KISS", krUSOKISS);
    } catch (e) {
        console.log("krUSO-KISS", "already exists");
    }
    try {
        const krAAPLKISS = await Factory.createPair(krAAPL.address, KISS.address);
        console.log("krAAPL-KISS", krAAPLKISS);
    } catch (e) {
        console.log("krUSO-AAPL", "already exists");
    }
    try {
        const krIAUKISS = await Factory.createPair(krIAU.address, KISS.address);
        console.log("krIAU-KISS", krIAUKISS);
    } catch (e) {
        console.log("krIAU-KISS", "already exists");
    }
    try {
        const krCOINKISS = await Factory.createPair(krCOIN.address, KISS.address);
        console.log("krCOIN-KISS", krCOINKISS);
    } catch (e) {
        console.log("krCOIN-KISS", "already exists");
    }
    try {
        const krAMCKISS = await Factory.createPair(krAMC.address, KISS.address);
        console.log("krAMC-KISS", krAMCKISS);
    } catch (e) {
        console.log("krAMC-KISS", "already exists");
    }

    const Staking = await hre.getContractOrFork("KrStaking");
    const [rewardToken1] = testnetConfigs.opgoerli.rewardTokens;
    const Reward1 = await hre.getContractOrFork("ERC20PresetMinterPauser", rewardToken1.symbol);
    const RewardTokens = [Reward1.address];
    for (const pool of batchBStakingPools) {
        console.log(`Adding pool ${pool.lpToken[0].symbol}- ${pool.lpToken[1].symbol}`);
        const [token0, token1] = pool.lpToken;
        const Token0 = await hre.getContractOrFork("ERC20Upgradeable", token0.symbol);
        const Token1 = await hre.getContractOrFork("ERC20Upgradeable", token1.symbol);
        const lpToken = await Factory.getPair(Token0.address, Token1.address);

        console.log("lpToken", lpToken);
        const result0 = await Staking.getPidFor(lpToken);
        if (!result0.found) {
            const tx = await Staking.addPool(RewardTokens, lpToken, pool.allocPoint, pool.startBlock);
            await tx.wait();
        }
    }
}

run()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
